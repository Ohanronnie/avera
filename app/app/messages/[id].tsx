import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import * as ImagePicker from "expo-image-picker";
import { VideoView, useVideoPlayer } from "expo-video";
import { router, useLocalSearchParams } from "expo-router";
import { useColorScheme } from "nativewind";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import Gallery from "react-native-awesome-gallery";
import { connectSocket } from "@/utils/socket";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import {
  KeyboardChatScrollView,
  KeyboardStickyView,
} from "react-native-keyboard-controller";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import type { Socket } from "socket.io-client";

import { MessageThread } from "@/components/messages/message-thread";
import { Text } from "@/components/themed/theme";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { axiosInstance } from "@/utils/axios";

const quickReplies = [
  "Is this still available?",
  "Can you share more photos?",
  "What is your last price?",
  "Can we use escrow?",
];

const MAX_CHAT_IMAGES = 8;
const VIDEO_EXTENSIONS = /\.(mp4|mov|m4v|webm|3gp|mkv)(\?.*)?$/i;

type PendingMediaItem = {
  uri: string;
  type: "image" | "video";
  mimeType?: string | null;
  fileName?: string | null;
};

const parsePriceValue = (value?: number | string | null) => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsedValue = parseFloat(value.replace(/,/g, "").trim());
    return Number.isFinite(parsedValue) ? parsedValue : 0;
  }

  return 0;
};

const sanitizePriceInput = (value: string) => {
  const sanitizedValue = value.replace(/[^0-9.]/g, "");
  const [wholePart = "", ...decimalParts] = sanitizedValue.split(".");

  if (!decimalParts.length) return sanitizedValue;

  return `${wholePart}.${decimalParts.join("")}`;
};

const isVideoUrl = (url?: string) => Boolean(url && VIDEO_EXTENSIONS.test(url));

function FullscreenVideoPlayer({ url }: { url: string }) {
  const player = useVideoPlayer(url, (videoPlayer) => {
    videoPlayer.play();
  });

  return (
    <VideoView
      player={player}
      nativeControls
      contentFit="contain"
      style={{ flex: 1, backgroundColor: "black" }}
    />
  );
}

type RawConversationPayload = {
  conversationId: number;
  buyerId: number;
  sellerId: number;
  messages: RawMessagePayload[];
  counterparty: {
    id: number;
    username: string;
    firstName: string;
    lastName: string;
    avatarUrl: string;
  };
  product: {
    id: number;
    name: string;
    price: number;
    quantity: number;
    sellerId: number;
    images: Array<{ url: string }>;
  };
  sellerName: string;
};

type RawMessagePayload = {
  id: number;
  messageId: number;
  conversationId: number;
  senderId: number;
  senderName: string;
  content?: string;
  imageUrl: string;
  offerAmount?: number;
  offerQuantity: number;
  offerStatus: "PENDING" | "ACCEPTED" | "REJECTED";
  createdAt: string | Date;
  readAt?: string | Date;
};

type MessageItem = {
  id: number;
  conversationId: number;
  senderId: number;
  fromMe: boolean;
  text?: string;
  time: string;
  status: string;
  imageUrl?: string;
  offerAmount?: number;
  offerQuantity?: number;
  offerStatus?: "PENDING" | "ACCEPTED" | "REJECTED";
  createdAt: string;
  deliveredAt?: string;
  readAt?: string | Date;
  localStatus?: "sending" | "failed";
};

type CheckoutOrder = {
  id: number;
  code: string;
  status: string;
  statusText: string;
  quantity: number;
  totalAmount?: number;
  paymentReference?: string;
};

const formatPrice = (value?: number | string | null) =>
  `₦${parsePriceValue(value).toLocaleString()}`;

const formatMessageTime = (value?: string | Date) => {
  const date = value ? new Date(value) : new Date();
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getProductImageUrl = (images: Array<{ url: string }>) => images[0].url;

const getLatestCheckoutStatus = (items: MessageItem[]) =>
  items
    .slice()
    .reverse()
    .find((item) => item.text?.startsWith("Checkout status:"))
    ?.text?.replace("Checkout status:", "")
    .trim() || null;

const getLiveCheckoutStatus = (
  checkoutOrder: CheckoutOrder | null,
  latestCheckoutStatus: string | null,
) => {
  const code = checkoutOrder?.code || "this order";

  if (checkoutOrder?.status === "PENDING_TRANSFER") {
    return `Buyer is paying for ${code}.`;
  }
  if (checkoutOrder?.status === "PAID_IN_ESCROW") {
    return `Payment confirmed for ${code}.`;
  }
  if (checkoutOrder?.status === "SELLER_PREPARING") {
    return `${code} is being prepared.`;
  }
  if (checkoutOrder?.status === "SHIPPED") {
    return `${code} has shipped.`;
  }
  if (checkoutOrder?.status === "DELIVERED") {
    return `${code} is waiting for buyer confirmation.`;
  }
  if (checkoutOrder?.status === "COMPLETED") {
    return `${code} is complete.`;
  }

  return latestCheckoutStatus;
};

const getMessageStatus = (message: {
  localStatus?: "sending" | "failed";
  readAt?: string | Date;
  deliveredAt?: string | Date;
  createdAt?: string;
}) => {
  if (message.localStatus === "failed") return "Failed";
  if (message.localStatus === "sending") return "Sending";
  if (message.readAt) return "Seen";
  if (message.deliveredAt || message.createdAt) return "Delivered";
  return "Sent";
};

const buildMessage = ({
  payload,
  conversationId,
  currentUserId,
}: {
  payload: RawMessagePayload;
  conversationId: number;
  currentUserId?: number | null;
}): MessageItem => {
  const createdAt = new Date(payload.createdAt).toISOString();
  const deliveredAt = createdAt;
  const senderId = payload.senderId;
  const offerAmount = parsePriceValue(payload.offerAmount);

  const offerQuantity = payload.offerQuantity;
  const text =
    offerAmount > 0
      ? `I would like to offer ₦${offerAmount.toLocaleString()}${offerQuantity ? ` x ${offerQuantity}` : ""} for this item.`
      : payload.content;
  const readAt = payload.readAt ? new Date(payload.readAt) : undefined;

  const nextMessage: MessageItem = {
    id: payload.messageId ?? payload.id,
    conversationId,
    senderId,
    fromMe: Boolean(currentUserId && senderId === currentUserId),
    text,
    time: formatMessageTime(createdAt),
    status: "Sent",
    imageUrl: payload.imageUrl,
    offerAmount,
    offerQuantity,
    offerStatus: payload.offerStatus,
    createdAt,
    deliveredAt,
    readAt,
  };
  nextMessage.status = getMessageStatus(nextMessage);
  return nextMessage;
};

const createOptimisticMessage = ({
  conversationId,
  currentUserId,
  text,
  imageUrl,
  offerAmount,
  offerQuantity,
}: {
  conversationId: number;
  currentUserId: number;
  text: string;
  imageUrl?: string;
  offerAmount?: number;
  offerQuantity?: number;
}): MessageItem => {
  const createdAt = new Date().toISOString();
  const nextMessage: MessageItem = {
    id: -Date.now() - Math.round(Math.random() * 1000),
    conversationId,
    senderId: currentUserId,
    fromMe: true,
    text,
    time: formatMessageTime(createdAt),
    status: "Sending",
    imageUrl,
    offerAmount: offerAmount,
    offerQuantity: offerQuantity,
    offerStatus: offerAmount ? "PENDING" : undefined,
    createdAt,
    localStatus: "sending",
  };
  nextMessage.status = getMessageStatus(nextMessage);
  return nextMessage;
};

const emitWithAck = <TResponse,>(
  socket: Socket,
  event: string,
  payload: Record<string, unknown>,
) =>
  new Promise<TResponse>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Socket request timed out"));
    }, 8000);

    socket.emit(event, payload, (response: TResponse) => {
      clearTimeout(timeout);
      resolve(response);
    });
  });

export default function MessageDetailsScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const toast = useToast();
  const scrollViewRef = useRef<any>(null);
  const [message, setMessage] = useState("");
  const [actionsOpen, setActionsOpen] = useState(false);
  const [offerOpen, setOfferOpen] = useState(false);
  const [buyNowOpen, setBuyNowOpen] = useState(false);
  const [offerAmount, setOfferAmount] = useState("");
  const [buyQuantity, setBuyQuantity] = useState(1);
  const [composerHeight, setComposerHeight] = useState(0);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [checkoutOrder, setCheckoutOrder] = useState<CheckoutOrder | null>(
    null,
  );
  const [pendingMedia, setPendingMedia] = useState<PendingMediaItem[]>([]);
  const [sending, setSending] = useState(false);
  const [viewingImageUrls, setViewingImageUrls] = useState<string[]>([]);
  const [viewingImageIndex, setViewingImageIndex] = useState(0);
  const [viewingVideoUrl, setViewingVideoUrl] = useState<string | null>(null);
  const [conversationMeta, setConversationMeta] = useState<{
    counterpartyId: number | null;
    productId: number;
    sellerName: string;
    sellerId: number | null;
    productName: string;
    productPrice: number;
    productQuantity: number;
    productImage: string | null;
  } | null>(null);
  const params = useLocalSearchParams<{
    id?: string;
  }>();
  const currentUserId = user!.id;
  const conversationId = Number(params.id);

  const sellerName = conversationMeta?.sellerName || "Avera Seller";
  const productName = conversationMeta?.productName || "Product listing";
  const productPrice = conversationMeta?.productPrice;
  const sellerInitial = sellerName.slice(0, 1).toUpperCase();
  const productNumericPrice = parsePriceValue(conversationMeta?.productPrice);
  const isSeller = Boolean(
    currentUserId &&
    conversationMeta?.sellerId &&
    Number(currentUserId) === Number(conversationMeta.sellerId),
  );
  const canCancelOrder =
    !isSeller && checkoutOrder?.status === "PENDING_TRANSFER";

  const latestAcceptedOffer = useMemo(
    () =>
      messages
        .slice()
        .reverse()
        .find(
          (item) =>
            Boolean(item.offerAmount) && item.offerStatus === "ACCEPTED",
        ) || null,
    [messages],
  );

  const latestIncomingOffer = useMemo(() => {
    if (latestAcceptedOffer) return null;

    return (
      messages
        .slice()
        .reverse()
        .find(
          (item) =>
            Boolean(item.offerAmount) &&
            !item.fromMe &&
            item.offerStatus === "PENDING",
        ) || null
    );
  }, [latestAcceptedOffer, messages]);

  const visibleMessages = useMemo(() => {
    if (!latestAcceptedOffer) return messages;

    return messages.filter(
      (item) => !item.offerAmount || item.id === latestAcceptedOffer.id,
    );
  }, [latestAcceptedOffer, messages]);
  const hasPendingMedia = pendingMedia.length > 0;
  const availableQuantity = Math.max(
    1,
    Number(conversationMeta?.productQuantity || 1),
  );
  const checkoutUnitPrice = latestAcceptedOffer?.offerAmount
    ? parsePriceValue(latestAcceptedOffer.offerAmount)
    : productNumericPrice;
  const buyTotal = checkoutUnitPrice * buyQuantity;
  const latestCheckoutStatus = useMemo(
    () => getLatestCheckoutStatus(messages),
    [messages],
  );
  const liveCheckoutStatus = useMemo(
    () => getLiveCheckoutStatus(checkoutOrder, latestCheckoutStatus),
    [checkoutOrder, latestCheckoutStatus],
  );
  const buyerCheckoutStatus = useMemo(() => {
    if (!liveCheckoutStatus) return null;
    return liveCheckoutStatus
      .replace(/^Buyer is /i, "You are ")
      .replace(/^Buyer /i, "You ");
  }, [liveCheckoutStatus]);
  const acceptedOfferPaid =
    Boolean(latestAcceptedOffer) &&
    (checkoutOrder?.status === "PAID_IN_ESCROW" ||
      checkoutOrder?.status === "SELLER_PREPARING" ||
      checkoutOrder?.status === "SHIPPED" ||
      checkoutOrder?.status === "DELIVERED" ||
      checkoutOrder?.status === "COMPLETED");
  const directCheckoutActive = !latestAcceptedOffer && Boolean(checkoutOrder);
  const directCheckoutPending = checkoutOrder?.status === "PENDING_TRANSFER";
  const directCheckoutPaid =
    checkoutOrder?.status === "PAID_IN_ESCROW" ||
    checkoutOrder?.status === "SELLER_PREPARING" ||
    checkoutOrder?.status === "SHIPPED" ||
    checkoutOrder?.status === "DELIVERED" ||
    checkoutOrder?.status === "COMPLETED";
  const directBuyLabel = isSeller
    ? "Your listing"
    : directCheckoutPending
      ? "Continue paying"
      : directCheckoutPaid
        ? "View order"
        : "Buy now";

  useEffect(() => {
    setBuyQuantity((current) =>
      Math.min(Math.max(current, 1), availableQuantity),
    );
  }, [availableQuantity]);

  const scrollToBottom = useCallback((animated = true) => {
    requestAnimationFrame(() => {
      scrollViewRef.current?.scrollToEnd({ animated });
    });
  }, []);

  const appendMessage = useCallback((nextMessage: MessageItem) => {
    setMessages((current) => {
      if (current.some((item) => item.id === nextMessage.id)) return current;
      return [...current, nextMessage];
    });
  }, []);

  const reconcileMessage = useCallback((nextMessage: MessageItem) => {
    setMessages((current) => {
      const exactIndex = current.findIndex(
        (item) => item.id === nextMessage.id,
      );
      if (exactIndex >= 0) {
        const updated = [...current];
        updated[exactIndex] = {
          ...updated[exactIndex],
          ...nextMessage,
          status: getMessageStatus(nextMessage),
        };
        return updated;
      }

      const optimisticIndex = current.findIndex(
        (item) =>
          item.localStatus === "sending" &&
          item.senderId === nextMessage.senderId &&
          item.conversationId === nextMessage.conversationId &&
          (item.offerAmount || null) === (nextMessage.offerAmount || null) &&
          (item.imageUrl || null) === (nextMessage.imageUrl || null) &&
          (item.text || "") === (nextMessage.text || ""),
      );

      if (optimisticIndex === -1) return [...current, nextMessage];

      const updated = [...current];
      updated[optimisticIndex] = {
        ...nextMessage,
        status: getMessageStatus(nextMessage),
      };
      return updated;
    });
  }, []);

  const markMessageFailed = useCallback((messageId: number) => {
    setMessages((current) =>
      current.map((item) => {
        if (item.id !== messageId) return item;
        const failedMessage = {
          ...item,
          localStatus: "failed" as const,
        };
        return {
          ...failedMessage,
          status: getMessageStatus(failedMessage),
        };
      }),
    );
  }, []);

  useEffect(() => {
    if (!messages.length) return;
    scrollToBottom(false);
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (!conversationId) {
      toast.show({
        title: "Chat unavailable",
        description: "This conversation is missing an ID.",
        variant: "error",
      });
      return;
    }

    const socket = connectSocket();
    let active = true;

    const handleIncoming = (payload: RawMessagePayload) => {
      if (payload.conversationId !== conversationId) return;
      reconcileMessage(
        buildMessage({
          payload,
          conversationId,
          currentUserId: Number(currentUserId),
        }),
      );
    };

    const loadConversation = async () => {
      try {
        await emitWithAck<{ conversationId: number; success: boolean }>(
          socket,
          "conversation:join",
          { conversationId },
        );

        const payload = await emitWithAck<RawConversationPayload>(
          socket,
          "conversations:get",
          { conversationId },
        );

        if (!active) return;

        setConversationMeta({
          counterpartyId: payload.counterparty.id,
          sellerName:
            [payload.counterparty.firstName, payload.counterparty.lastName]
              .filter(Boolean)
              .join(" ") || payload.sellerName,
          sellerId: payload.sellerId,
          productId: payload.product.id,
          productName: payload.product.name,
          productPrice: payload.product.price,
          productQuantity: payload.product.quantity,

          productImage: getProductImageUrl(payload.product.images),
        });
        setMessages(
          (payload.messages || []).map((item) =>
            buildMessage({
              payload: item,
              conversationId,
              currentUserId: Number(currentUserId),
            }),
          ),
        );
      } catch (error: any) {
        if (!active) return;
        toast.show({
          title: "Chat unavailable",
          description:
            error?.response?.data?.message ||
            error?.message ||
            "We couldn't open this conversation right now.",
          variant: "error",
        });
      }
    };

    socket.on("conversation:newMessage", handleIncoming);
    socket.on("conversation:newOffer", handleIncoming);
    socket.on("conversation:offerResponse", handleIncoming);

    loadConversation();

    return () => {
      active = false;
      socket.off("conversation:newMessage", handleIncoming);
      socket.off("conversation:newOffer", handleIncoming);
      socket.off("conversation:offerResponse", handleIncoming);
    };
  }, [conversationId, currentUserId, reconcileMessage, toast]);

  const refreshConversationCheckout = useCallback(async () => {
    if (!conversationId || !conversationMeta?.productId) {
      setCheckoutOrder(null);
      return;
    }

    try {
      const { data } = await axiosInstance.get<CheckoutOrder | null>(
        "/orders/current",
        {
          params: {
            conversationId,
            productId: conversationMeta.productId,
            source: latestAcceptedOffer ? "OFFER" : "BUY_NOW",
          },
        },
      );
      setCheckoutOrder(data);
    } catch {
      setCheckoutOrder(null);
    }
  }, [conversationId, conversationMeta?.productId, latestAcceptedOffer]);

  useEffect(() => {
    refreshConversationCheckout();
  }, [refreshConversationCheckout, messages.length]);

  const openSellerProfile = () => {
    if (!conversationMeta?.counterpartyId) return;
    router.push({
      pathname: "/seller/[id]",
      params: {
        id: String(conversationMeta.counterpartyId),
        profileKind: isSeller ? "buyer" : "seller",
      },
    });
  };

  const openProductDetails = () => {
    if (!conversationMeta?.productId) return;

    setActionsOpen(false);
    router.push({
      pathname: "/product-details/[id]",
      params: { id: String(conversationMeta.productId) },
    });
  };

  const cancelPendingOrder = async () => {
    if (!checkoutOrder?.id || !canCancelOrder) return;

    try {
      await axiosInstance.post(`/orders/${checkoutOrder.id}/cancel`);
      setActionsOpen(false);
      await refreshConversationCheckout();
      toast.show({
        title: "Order cancelled",
        description: "The pending order was cancelled successfully.",
        variant: "success",
      });
    } catch (error: any) {
      toast.show({
        title: "Unable to cancel order",
        description:
          error?.response?.data?.message ||
          error?.message ||
          "This order can't be cancelled right now.",
        variant: "error",
      });
    }
  };

  const actionItems = [
    {
      icon: "cube-outline",
      title: "View product",
      description: "Open the listing attached to this chat.",
      tone: "default" as const,
      onPress: openProductDetails,
    },
    {
      icon: "notifications-outline",
      title: "Mute conversation",
      description: "Pause message alerts from this seller.",
      tone: "default" as const,
      onPress: () => {
        setActionsOpen(false);
        toast.show({
          title: "Not available yet",
          description: "Mute conversation will be available soon.",
          variant: "info",
        });
      },
    },
    {
      icon: "flag-outline",
      title: "Report seller",
      description: "Tell us if something feels suspicious.",
      tone: "warning" as const,
      onPress: () => {
        setActionsOpen(false);
        toast.show({
          title: "Not available yet",
          description: "Reporting from chat will be available soon.",
          variant: "info",
        });
      },
    },
    ...(canCancelOrder
      ? [
          {
            icon: "close-circle-outline",
            title: "Cancel order",
            description:
              "Cancel this unpaid order and return the reserved quantity.",
            tone: "danger" as const,
            onPress: cancelPendingOrder,
          },
        ]
      : []),
  ];

  const openCheckoutReview = () => {
    if (!conversationId) {
      return;
    }

    setBuyNowOpen(false);

    if (checkoutOrder?.id) {
      if (directCheckoutPaid || acceptedOfferPaid) {
        router.push({
          pathname: "/order/[id]",
          params: { id: String(checkoutOrder.id) },
        });
        return;
      }

      router.push({
        pathname: "/checkout/pay",
        params: {
          orderId: String(checkoutOrder.id),
          conversationId: String(conversationId),
          quantity: String(checkoutOrder.quantity || buyQuantity),
        },
      });
      return;
    }

    router.push({
      pathname: "/checkout/review",
      params: {
        quantity: String(latestAcceptedOffer?.offerQuantity || buyQuantity),
        conversationId: String(conversationId),
      },
    });
  };

  const openOrder = (id: number) => {
    if (!id) return;
    router.push({
      pathname: "/order/[id]",
      params: { id: String(id) },
    });
  };

  const incrementBuyQuantity = () => {
    setBuyQuantity((current) => Math.min(availableQuantity, current + 1));
  };

  const decrementBuyQuantity = () => {
    setBuyQuantity((current) => Math.max(1, current - 1));
  };

  const respondToOffer = async (response: "accept" | "reject") => {
    if (!latestIncomingOffer || !conversationId) return;

    reconcileMessage({
      ...latestIncomingOffer,
      offerStatus: response === "accept" ? "ACCEPTED" : "REJECTED",
    });

    try {
      connectSocket().emit("conversation:offerResponse", {
        conversationId,
        offerId: latestIncomingOffer.id,
        response,
      });
    } catch (error: any) {
      reconcileMessage(latestIncomingOffer);
      toast.show({
        title:
          response === "accept" ? "Offer not accepted" : "Offer not rejected",
        description:
          error?.response?.data?.message ||
          error?.message ||
          "Please check your connection and try again.",
        variant: "error",
      });
    }
  };

  const sendMessage = async () => {
    const trimmed = message.trim();
    if ((!trimmed && !hasPendingMedia) || !conversationId || sending) return;

    const selectedMedia = pendingMedia;

    try {
      setSending(true);
      setMessage("");

      const mediaUrls = selectedMedia.length
        ? await uploadChatMedia(selectedMedia)
        : [];
      if (selectedMedia.length && mediaUrls.length !== selectedMedia.length) {
        throw new Error("Media upload failed");
      }

      const payloads =
        mediaUrls.length > 0
          ? mediaUrls.map((imageUrl, index) => ({
              content: index === 0 ? trimmed : "",
              imageUrl,
            }))
          : [{ content: trimmed, imageUrl: undefined }];

      for (const payload of payloads) {
        const optimisticMessage = createOptimisticMessage({
          conversationId,
          currentUserId: Number(currentUserId),
          text: payload.content,
          imageUrl: payload.imageUrl,
        });

        appendMessage(optimisticMessage);

        try {
          connectSocket().emit("conversation:message", {
            conversationId,
            content: payload.content,
            imageUrl: payload.imageUrl,
          });
        } catch (error) {
          markMessageFailed(optimisticMessage.id);
          throw error;
        }
      }

      setPendingMedia([]);
    } catch (error: any) {
      setMessage(trimmed);
      setPendingMedia(selectedMedia);
      toast.show({
        title: "Message not sent",
        description:
          error?.response?.data?.message ||
          error?.message ||
          "Please check your connection and try again.",
        variant: "error",
      });
    } finally {
      setSending(false);
    }
  };

  const uploadChatMedia = useCallback(async (items: PendingMediaItem[]) => {
    const formData = new FormData();
    items.forEach((item, index) => {
      formData.append("images", {
        uri: item.uri,
        name:
          item.fileName ||
          item.uri.split("/").pop() ||
          `chat-media-${index + 1}.${item.type === "video" ? "mp4" : "jpg"}`,
        type:
          item.mimeType || (item.type === "video" ? "video/mp4" : "image/jpeg"),
      } as any);
    });

    const { data } = await axiosInstance.post<{
      files: Array<{ path: string }>;
    }>("/uploads/images", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    return data.files.map((file) => file.path).filter(Boolean);
  }, []);

  const pickMediaMessage = useCallback(async () => {
    if (sending) return;
    if (pendingMedia.length >= MAX_CHAT_IMAGES) {
      toast.show({
        title: "Media limit reached",
        description: `You can send up to ${MAX_CHAT_IMAGES} items at once.`,
        variant: "error",
      });
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      toast.show({
        title: "Media unavailable",
        description: "Allow photo and video access to send media in chat.",
        variant: "error",
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: Math.max(1, MAX_CHAT_IMAGES - pendingMedia.length),
    });

    if (result.canceled) return;

    const pickedMedia = result.assets
      .filter((asset) => asset.uri)
      .slice(0, MAX_CHAT_IMAGES - pendingMedia.length)
      .map(
        (asset) =>
          ({
            uri: asset.uri,
            type: asset.type === "video" ? "video" : "image",
            mimeType: asset.mimeType,
            fileName: asset.fileName,
          }) satisfies PendingMediaItem,
      );

    if (!pickedMedia.length) return;

    setPendingMedia((current) =>
      [...current, ...pickedMedia].slice(0, MAX_CHAT_IMAGES),
    );
    setTimeout(() => scrollToBottom(), 80);
  }, [pendingMedia.length, scrollToBottom, sending, toast]);

  const openImageViewer = useCallback((urls: string[], index = 0) => {
    if (!urls.length) return;
    setViewingImageUrls(urls);
    setViewingImageIndex(Math.min(Math.max(index, 0), urls.length - 1));
  }, []);

  const openVideoViewer = useCallback((url: string) => {
    if (!url) return;
    setViewingVideoUrl(url);
  }, []);

  const submitOffer = async () => {
    const amount = parsePriceValue(offerAmount);
    if (!amount || !conversationId) return;

    const optimisticMessage = createOptimisticMessage({
      conversationId,
      currentUserId: Number(currentUserId),
      text: `I would like to offer ₦${amount.toLocaleString()} x 1 for this item.`,
      offerAmount: amount,
      offerQuantity: 1,
    });

    appendMessage(optimisticMessage);
    setOfferAmount("");
    setOfferOpen(false);

    try {
      connectSocket().emit("conversation:offer", {
        conversationId,
        offerAmount: amount,
        offerQuantity: 1,
      });
    } catch (error: any) {
      markMessageFailed(optimisticMessage.id);
      toast.show({
        title: "Offer not sent",
        description:
          error?.response?.data?.message ||
          error?.message ||
          "Please check your connection and try again.",
        variant: "error",
      });
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#0A0A0A]" edges={["top"]}>
      <Modal
        visible={Boolean(viewingImageUrls.length)}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setViewingImageUrls([]);
          setViewingImageIndex(0);
        }}
      >
        <View className="flex-1 bg-black">
          <StatusBar style="light" translucent backgroundColor="transparent" />
          <View className="flex-1 bg-black">
            <View
              className="bg-black px-4 pb-3"
              style={{ paddingTop: Math.max(insets.top, 16) }}
            >
              <View className="flex-row items-center justify-between">
                <Pressable
                  onPress={() => {
                    setViewingImageUrls([]);
                    setViewingImageIndex(0);
                  }}
                  className="h-11 min-w-20 items-start justify-center"
                >
                  <Text variant="none" className="text-lg font-bold text-white">
                    Close
                  </Text>
                </Pressable>
                <Text variant="none" className="text-lg font-bold text-white">
                  {viewingImageUrls.length > 1
                    ? `${viewingImageIndex + 1}/${viewingImageUrls.length}`
                    : "Image"}
                </Text>
                <View className="h-11 min-w-20" />
              </View>
            </View>
            <View className="flex-1 bg-black">
              {viewingImageUrls.length ? (
                <Gallery
                  key={viewingImageUrls.join("|")}
                  data={viewingImageUrls}
                  initialIndex={viewingImageIndex}
                  onIndexChange={setViewingImageIndex}
                  onSwipeToClose={() => {
                    setViewingImageUrls([]);
                    setViewingImageIndex(0);
                  }}
                  onTap={() => {
                    setViewingImageUrls([]);
                    setViewingImageIndex(0);
                  }}
                  disableSwipeUp
                  style={{ flex: 1, backgroundColor: "black" }}
                />
              ) : null}
            </View>
            <View
              className="bg-black"
              style={{ height: Math.max(insets.bottom, 16) + 16 }}
            />
          </View>
        </View>
      </Modal>

      <Modal
        visible={Boolean(viewingVideoUrl)}
        transparent
        animationType="fade"
        onRequestClose={() => setViewingVideoUrl(null)}
      >
        <View className="flex-1 bg-black">
          <StatusBar style="light" translucent backgroundColor="transparent" />
          <View className="flex-1 bg-black">
            <View
              className="bg-black px-4 pb-3"
              style={{ paddingTop: Math.max(insets.top, 16) }}
            >
              <View className="flex-row items-center justify-between">
                <Pressable
                  onPress={() => setViewingVideoUrl(null)}
                  className="h-11 min-w-20 items-start justify-center"
                >
                  <Text variant="none" className="text-lg font-bold text-white">
                    Close
                  </Text>
                </Pressable>
                <Text variant="none" className="text-lg font-bold text-white">
                  Video
                </Text>
                <View className="h-11 min-w-20" />
              </View>
            </View>
            <View className="flex-1 bg-black">
              {viewingVideoUrl ? (
                <FullscreenVideoPlayer url={viewingVideoUrl} />
              ) : null}
            </View>
            <View
              className="bg-black"
              style={{ height: Math.max(insets.bottom, 16) + 16 }}
            />
          </View>
        </View>
      </Modal>

      <View className="flex-1">
        <View className="border-b border-gray-100 bg-white px-4 pb-3 pt-3 dark:border-white/5 dark:bg-[#0A0A0A]">
          <View className="flex-row items-center border-b border-gray-100 bg-white px-4 pb-3 pt-3 dark:border-white/5 dark:bg-[#0A0A0A]">
            <Pressable
              onPress={() => router.back()}
              className="h-11 w-11 items-center justify-center rounded-full border border-gray-100 bg-gray-50 dark:border-white/10 dark:bg-white/5"
            >
              <Ionicons
                name="chevron-back"
                size={22}
                color={isDark ? "white" : "#111827"}
              />
            </Pressable>

            <Pressable
              onPress={openSellerProfile}
              className="ml-3 flex-1 flex-row items-center"
            >
              <View className="relative h-12 w-12 items-center justify-center rounded-2xl bg-brand/10">
                <Text
                  variant="none"
                  className="text-base font-semibold text-brand"
                >
                  {sellerInitial}
                </Text>
                <View className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500 dark:border-[#0A0A0A]" />
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-base font-bold text-gray-950 dark:text-white">
                  {sellerName}
                </Text>
                <Text className="mt-0.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                  Online • usually replies fast
                </Text>
              </View>
            </Pressable>

            <Pressable
              onPress={() => setActionsOpen(true)}
              className="h-11 w-11 items-center justify-center rounded-full bg-gray-50 dark:bg-white/5"
            >
              <Ionicons
                name="ellipsis-horizontal"
                size={20}
                color={isDark ? "white" : "#111827"}
              />
            </Pressable>
          </View>
          <Pressable className="mb-1 mt-4 flex-row rounded-2xl border border-gray-100 bg-gray-50 p-3 dark:border-white/5 dark:bg-white/5">
            {conversationMeta?.productImage ? (
              <Image
                source={{ uri: conversationMeta?.productImage }}
                className="h-12 w-12 rounded-2xl bg-gray-200 dark:bg-white/10"
              />
            ) : (
              <View className="h-20 w-20 items-center justify-center rounded-2xl bg-brand/10">
                <Ionicons name="cube-outline" size={24} color="#2563EB" />
              </View>
            )}
            <View className="ml-3 flex-1 justify-center">
              <Text
                numberOfLines={2}
                className="text-base font-bold text-gray-950 dark:text-white"
              >
                {productName}
              </Text>

              <View className="mt-1 flex-row items-center">
                {latestAcceptedOffer?.offerAmount ? (
                  <>
                    <Text className="text-sm font-semibold text-gray-400 line-through dark:text-gray-500">
                      {formatPrice(productPrice)}
                    </Text>
                    <Text className="ml-2 text-sm font-semibold text-brand">
                      {formatPrice(latestAcceptedOffer.offerAmount)}
                    </Text>
                  </>
                ) : (
                  <Text className="text-sm font-semibold text-brand">
                    {formatPrice(productPrice)}
                  </Text>
                )}
              </View>
            </View>
            <View className="self-center">
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </View>
          </Pressable>
          <View className="mt-1 flex-row items-center justify-center px-2">
            <Ionicons
              name="information-circle-outline"
              size={15}
              color="#9CA3AF"
            />
            <Text className="ml-1.5 text-center text-xs leading-5 text-gray-500 dark:text-gray-400">
              Avoid sending money outside Avera.
            </Text>
          </View>
        </View>

        <KeyboardChatScrollView
          ref={scrollViewRef}
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 16,
            paddingBottom: composerHeight + 24,
          }}
          keyboardLiftBehavior="always"
          offset={composerHeight}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollToBottom(false)}
        >
          <View className="mb-5 items-center">
            <Text className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-500 dark:bg-white/5 dark:text-gray-400">
              Today
            </Text>
          </View>

          <MessageThread
            items={visibleMessages}
            sellerName={sellerName}
            onOpenImageViewer={openImageViewer}
            onOpenVideoViewer={openVideoViewer}
          />

          <View className="mt-8">
            <Text className="mb-2 text-xs font-bold uppercase tracking-widest text-gray-400">
              Quick replies
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row pr-4">
                {quickReplies.map((reply) => (
                  <Pressable
                    key={reply}
                    onPress={() => setMessage(reply)}
                    className="mr-2 rounded-full border border-gray-100 bg-gray-50 px-4 py-2 dark:border-white/10 dark:bg-white/5"
                  >
                    <Text className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                      {reply}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>
        </KeyboardChatScrollView>

        <KeyboardStickyView
          offset={{ closed: 0, opened: -8 }}
          className="border-t border-gray-100 bg-white px-4 pb-4 pt-3 dark:border-white/5 dark:bg-[#0A0A0A]"
          onLayout={(event) => {
            const nextHeight = Math.ceil(event.nativeEvent.layout.height);
            setComposerHeight((current) =>
              current === nextHeight ? current : nextHeight,
            );
          }}
        >
          {isSeller && liveCheckoutStatus ? (
            <View className="mb-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 dark:border-emerald-400/20 dark:bg-emerald-400/10">
              <Text className="text-xs font-bold uppercase text-emerald-700 dark:text-emerald-300">
                Checkout status
              </Text>
              <Text className="mt-1 text-sm font-semibold text-gray-950 dark:text-white">
                {liveCheckoutStatus}
              </Text>
              {checkoutOrder?.id ? (
                <Pressable
                  onPress={() => openOrder(checkoutOrder.id)}
                  className="mt-3 h-10 items-center justify-center rounded-2xl bg-emerald-500"
                >
                  <Text variant="none" className="text-sm font-bold text-white">
                    View order
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {!isSeller && latestAcceptedOffer ? (
            <View className="mb-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 dark:border-emerald-400/20 dark:bg-emerald-400/10">
              <Text className="text-xs font-bold uppercase text-emerald-700 dark:text-emerald-300">
                {acceptedOfferPaid ? "Payment secured" : "Offer accepted"}
              </Text>
              <Text className="mt-1 text-sm font-semibold text-gray-950 dark:text-white">
                {acceptedOfferPaid
                  ? `${checkoutOrder?.code || "Order"} is held in escrow.`
                  : buyerCheckoutStatus ||
                    "Continue to complete payment for this offer."}
              </Text>
              <Pressable
                onPress={openCheckoutReview}
                className="mt-3 h-10 items-center justify-center rounded-2xl bg-emerald-500"
              >
                <Text variant="none" className="text-sm font-bold text-white">
                  {acceptedOfferPaid
                    ? "View order"
                    : checkoutOrder?.id
                      ? "Continue paying"
                      : "Checkout offer"}
                </Text>
              </Pressable>
            </View>
          ) : null}

          {!isSeller && !latestAcceptedOffer && directCheckoutActive ? (
            <View className="mb-3 rounded-2xl border border-brand/20 bg-brand/10 p-3">
              <Text
                variant="none"
                className="text-xs font-bold uppercase text-brand"
              >
                {directCheckoutPaid ? "Payment secured" : "Checkout active"}
              </Text>
              <Text className="mt-1 text-sm font-semibold text-gray-950 dark:text-white">
                {buyerCheckoutStatus ||
                  `${checkoutOrder?.code || "Order"} is in progress.`}
              </Text>
              <Pressable
                onPress={openCheckoutReview}
                className="mt-3 h-10 items-center justify-center rounded-2xl bg-brand"
              >
                <Text variant="none" className="text-sm font-bold text-white">
                  {directCheckoutPaid ? "View order" : "Continue paying"}
                </Text>
              </Pressable>
            </View>
          ) : null}

          {!isSeller && !directCheckoutActive && !latestAcceptedOffer ? (
            <View className="mb-3 flex-row gap-2">
              <Pressable
                onPress={() => setOfferOpen(true)}
                className="flex-1 items-center justify-center rounded-2xl bg-gray-50 py-3 dark:bg-white/5"
              >
                <Text className="text-xs font-bold text-gray-600 dark:text-gray-300">
                  Offer price
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setBuyNowOpen(true)}
                className="flex-1 items-center justify-center rounded-2xl bg-brand py-3"
              >
                <Text variant="none" className="text-xs font-bold text-white">
                  {directBuyLabel}
                </Text>
              </Pressable>
            </View>
          ) : null}

          {isSeller && latestIncomingOffer?.offerAmount ? (
            <View className="mb-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 dark:border-emerald-400/20 dark:bg-emerald-400/10">
              <View className="flex-row items-center justify-between">
                <View className="flex-1 pr-3">
                  <Text className="text-xs font-bold uppercase text-emerald-700 dark:text-emerald-300">
                    Pending offer
                  </Text>
                  <Text className="mt-1 text-sm font-semibold text-gray-950 dark:text-white">
                    {formatPrice(latestIncomingOffer.offerAmount)}
                    {latestIncomingOffer.offerQuantity
                      ? ` x ${latestIncomingOffer.offerQuantity}`
                      : ""}
                  </Text>
                </View>
                <View className="flex-row gap-2">
                  <Pressable
                    onPress={() => respondToOffer("reject")}
                    className="rounded-full bg-white/80 px-4 py-2 dark:bg-white/10"
                  >
                    <Text className="text-xs font-bold text-gray-700 dark:text-gray-200">
                      Reject
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => respondToOffer("accept")}
                    className="rounded-full bg-brand px-4 py-2"
                  >
                    <Text
                      variant="none"
                      className="text-xs font-bold text-white"
                    >
                      Accept
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          ) : null}

          {hasPendingMedia ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mb-3"
              contentContainerStyle={{ paddingRight: 8 }}
            >
              {pendingMedia.map((item, index) => (
                <View key={`${item.uri}-${index}`} className="mr-2">
                  {item.type === "video" ? (
                    <View
                      className={`h-16 w-16 items-center justify-center rounded-2xl bg-black ${
                        sending ? "opacity-70" : ""
                      }`}
                    >
                      <Ionicons name="videocam" size={20} color="white" />
                    </View>
                  ) : (
                    <Image
                      source={{ uri: item.uri }}
                      className={`h-16 w-16 rounded-2xl bg-gray-200 dark:bg-white/10 ${
                        sending ? "opacity-70" : ""
                      }`}
                    />
                  )}
                  <Pressable
                    disabled={sending}
                    onPress={() =>
                      setPendingMedia((current) =>
                        current.filter((_, itemIndex) => itemIndex !== index),
                      )
                    }
                    className={`absolute -right-1 -top-1 h-6 w-6 items-center justify-center rounded-full bg-black/70 ${
                      sending ? "opacity-50" : ""
                    }`}
                  >
                    <Ionicons name="close" size={14} color="white" />
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          ) : null}

          {sending ? (
            <View className="mb-3 flex-row items-center">
              <ActivityIndicator size="small" color="#2563EB" />
              <Text className="ml-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                Sending{hasPendingMedia ? " media" : ""}...
              </Text>
            </View>
          ) : null}

          <View className="flex-row items-end justify-center rounded-3xl border border-gray-100 bg-gray-50 px-3 py-2 dark:border-white/10 dark:bg-white/5">
            <Pressable
              onPress={pickMediaMessage}
              disabled={sending || pendingMedia.length >= MAX_CHAT_IMAGES}
              className={`mb-1 h-10 w-10 items-center justify-center rounded-full bg-white dark:bg-white/10 ${
                sending || pendingMedia.length >= MAX_CHAT_IMAGES
                  ? "opacity-50"
                  : ""
              }`}
            >
              {sending && hasPendingMedia ? (
                <ActivityIndicator color="#2563EB" />
              ) : (
                <Ionicons
                  name="attach"
                  size={22}
                  color={isDark ? "white" : "#111827"}
                />
              )}
            </Pressable>
            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder="Message seller..."
              placeholderTextColor="#888"
              multiline
              className="max-h-28 flex-1 px-3 py-3 text-base text-gray-950 dark:text-white"
            />
            <Pressable
              onPress={sendMessage}
              disabled={sending || (!message.trim() && !hasPendingMedia)}
              className={`mb-1 h-10 w-10 items-center justify-center rounded-full ${
                message.trim() || hasPendingMedia
                  ? "bg-brand"
                  : "bg-gray-200 dark:bg-white/10"
              }`}
            >
              <Ionicons
                name="send"
                size={18}
                color={
                  message.trim() || hasPendingMedia
                    ? "white"
                    : isDark
                      ? "#9CA3AF"
                      : "#6B7280"
                }
              />
            </Pressable>
          </View>
        </KeyboardStickyView>
      </View>

      <BottomSheet
        visible={actionsOpen}
        coverTabs
        title="Conversation actions"
        subtitle={`Manage your chat with ${sellerName}.`}
        onClose={() => setActionsOpen(false)}
      >
        <View className="gap-3">
          {actionItems.map((item) => (
            <Pressable
              key={item.title}
              onPress={item.onPress}
              className="flex-row items-center rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-white/5 dark:bg-white/5"
            >
              <View
                className={`h-11 w-11 items-center justify-center rounded-2xl ${
                  item.tone === "danger"
                    ? "bg-red-500/10"
                    : item.tone === "warning"
                      ? "bg-amber-500/10"
                      : "bg-brand/10"
                }`}
              >
                <Ionicons
                  name={item.icon as any}
                  size={20}
                  color={
                    item.tone === "danger"
                      ? "#EF4444"
                      : item.tone === "warning"
                        ? "#F59E0B"
                        : "#2563EB"
                  }
                />
              </View>
              <View className="ml-3 flex-1">
                <Text
                  className={`font-bold ${
                    item.tone === "danger"
                      ? "text-red-500"
                      : "text-gray-950 dark:text-white"
                  }`}
                >
                  {item.title}
                </Text>
                <Text className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {item.description}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </Pressable>
          ))}
        </View>
      </BottomSheet>

      <BottomSheet
        visible={offerOpen}
        coverTabs
        title="Make an offer"
        subtitle="Send a price offer to the seller. This does not create an order yet."
        onClose={() => setOfferOpen(false)}
      >
        <View>
          <View className="rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-white/5 dark:bg-white/5">
            <Text className="text-xs font-bold uppercase  text-gray-400">
              Listed price
            </Text>
            <Text className="mt-1 text-2xl font-semibold text-gray-950 dark:text-white">
              {formatPrice(productPrice)}
            </Text>
          </View>
          <View className="flex-row  mt-4 items-start">
            <Ionicons name="information-circle-outline" size={16} />
            <Text className="ml-1 flex-1 text-xs leading-5 text-gray-600 dark:text-gray-300">
              You can only offer more than 80% of the price.
            </Text>
          </View>
          <View className="mt-1">
            <Text className="text-base font-bold text-gray-950 dark:text-white">
              Your offer
            </Text>
            <View className="mt-2 flex-row items-center rounded-2xl border border-gray-100 bg-gray-50 px-4 dark:border-white/10 dark:bg-white/5">
              <Text className="text-xl font-semibold text-brand">₦</Text>
              <TextInput
                value={offerAmount}
                onChangeText={(text) =>
                  setOfferAmount(sanitizePriceInput(text))
                }
                inputMode="decimal"
                keyboardType="decimal-pad"
                placeholder="Enter amount"
                placeholderTextColor="#888"
                className="h-16 pb-2 flex-1 px-3 text-xl font-bold text-gray-950 dark:text-white"
              />
            </View>
          </View>

          {parsePriceValue(productPrice) > 0 && (
            <View className="mt-4 flex-row flex-wrap">
              {[0.9, 0.85, 0.81].map((multiplier) => {
                const amount = (
                  parsePriceValue(productPrice) * multiplier
                ).toFixed(2);

                return (
                  <Pressable
                    key={multiplier}
                    onPress={() => setOfferAmount(String(amount))}
                    className="mb-2 mr-2 rounded-full bg-brand/10 px-4 py-2"
                  >
                    <Text
                      variant="none"
                      className="text-xs font-bold text-brand"
                    >
                      ₦{amount.toLocaleString()}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          <View className="mt-5 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
            <View className="flex-row items-start">
              <Ionicons
                name="information-circle-outline"
                size={20}
                color="#F59E0B"
              />
              <Text className="ml-2 flex-1 text-sm leading-5 text-gray-600 dark:text-gray-300">
                The seller can accept, reject, or counter your offer. Payment
                still goes through escrow later.
              </Text>
            </View>
          </View>

          <View className="mt-6 flex-row gap-3">
            <Pressable
              onPress={() => setOfferOpen(false)}
              className="h-14 flex-1 items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-white/5"
            >
              <Text className="font-bold text-gray-950 dark:text-white">
                Cancel
              </Text>
            </Pressable>
            <Pressable
              onPress={submitOffer}
              className={`h-14 flex-1 items-center justify-center rounded-2xl ${
                parsePriceValue(offerAmount) > 0 &&
                parsePriceValue(offerAmount) > productPrice! * 0.8 &&
                parsePriceValue(offerAmount) <= productPrice!
                  ? "bg-brand"
                  : "bg-gray-300 dark:bg-white/10"
              }`}
              disabled={
                !(
                  parsePriceValue(offerAmount) > 0 &&
                  parsePriceValue(offerAmount) > productPrice! * 0.8 &&
                  parsePriceValue(offerAmount) <= productPrice!
                )
              }
            >
              <Text variant="none" className="font-bold text-white">
                Send offer
              </Text>
            </Pressable>
          </View>
        </View>
      </BottomSheet>

      <BottomSheet
        visible={buyNowOpen}
        coverTabs
        title={latestAcceptedOffer ? "Checkout accepted offer" : "Buy now"}
        subtitle="Choose quantity to continue to review order."
        onClose={() => setBuyNowOpen(false)}
      >
        <View>
          <View className="rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-white/5 dark:bg-white/5">
            <Text className="text-xs font-bold uppercase text-gray-400">
              Unit price
            </Text>
            <View className="mt-2 flex-row items-center">
              {latestAcceptedOffer?.offerAmount ? (
                <>
                  <Text className="text-sm font-semibold text-gray-400 line-through dark:text-gray-500">
                    {formatPrice(productNumericPrice)}
                  </Text>
                  <Text
                    variant="none"
                    className="ml-2 text-2xl font-semibold text-brand"
                  >
                    {formatPrice(checkoutUnitPrice)}
                  </Text>
                </>
              ) : (
                <Text
                  variant="none"
                  className="text-2xl font-semibold text-brand"
                >
                  {formatPrice(checkoutUnitPrice)}
                </Text>
              )}
            </View>
            <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {productName}
            </Text>
          </View>

          <View className="mt-5 rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-white/5 dark:bg-white/5">
            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-4">
                <Text className="text-base font-bold text-gray-950 dark:text-white">
                  Quantity
                </Text>
                <Text className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {availableQuantity} available
                </Text>
              </View>
              <View className="flex-row items-center rounded-full border border-gray-100 bg-white p-1 dark:border-white/10 dark:bg-white/5">
                <Pressable
                  onPress={decrementBuyQuantity}
                  disabled={buyQuantity <= 1}
                  className={`h-10 w-10 items-center justify-center rounded-full ${
                    buyQuantity <= 1 ? "opacity-40" : ""
                  }`}
                >
                  <Ionicons
                    name="remove"
                    size={18}
                    color={isDark ? "white" : "#111827"}
                  />
                </Pressable>
                <Text className="min-w-10 text-center text-lg font-semibold text-gray-950 dark:text-white">
                  {buyQuantity}
                </Text>
                <Pressable
                  onPress={incrementBuyQuantity}
                  disabled={buyQuantity >= availableQuantity}
                  className={`h-10 w-10 items-center justify-center rounded-full bg-brand ${
                    buyQuantity >= availableQuantity ? "opacity-40" : ""
                  }`}
                >
                  <Ionicons name="add" size={18} color="white" />
                </Pressable>
              </View>
            </View>

            <View className="mt-4 border-t border-gray-100 pt-4 dark:border-white/10">
              <View className="flex-row items-center justify-between">
                <Text className="text-sm text-gray-500 dark:text-gray-400">
                  Total
                </Text>
                <Text
                  variant="none"
                  className="text-xl font-semibold text-brand"
                >
                  {formatPrice(buyTotal)}
                </Text>
              </View>
            </View>
          </View>

          <View className="mt-6 flex-row gap-3">
            <Pressable
              onPress={() => setBuyNowOpen(false)}
              className="h-14 flex-1 items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-white/5"
            >
              <Text className="font-bold text-gray-950 dark:text-white">
                Cancel
              </Text>
            </Pressable>
            <Pressable
              onPress={openCheckoutReview}
              className="h-14 flex-1 items-center justify-center rounded-2xl bg-brand"
            >
              <Text variant="none" className="font-bold text-white">
                Review order
              </Text>
            </Pressable>
          </View>
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}
