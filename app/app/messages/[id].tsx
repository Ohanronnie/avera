import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useColorScheme } from "nativewind";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Text } from "@/components/themed/theme";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { BASE_URL, axiosInstance } from "@/utils/axios";
import { connectSocket } from "@/utils/socket";

const quickReplies = [
  "Is this still available?",
  "Can you share more photos?",
  "What is your last price?",
  "Can we use escrow?",
];

const MIN_OFFER_PERCENT = 80;
const MAX_CHAT_IMAGES = 5;

type ChatMessage = {
  id: number;
  conversationId: number;
  senderId: number;
  senderName?: string;
  content: string;
  imageUrl?: string | null;
  offerAmount?: number | null;
  offerQuantity?: number | null;
  offerStatus?: "PENDING" | "ACCEPTED" | "REJECTED" | null;
  readAt?: string | null;
  deliveredAt?: string | null;
  createdAt: string;
  localStatus?: "sending" | "failed";
};

type ChatConversation = {
  id: number;
  buyerId?: number;
  sellerId?: number;
  productId: number;
  product?: {
    quantity?: number;
  };
};

type SendChatMessageInput = {
  content: string;
  imageUrl?: string;
  offerAmount?: number;
  offerQuantity?: number;
};

const actionItems = [
  {
    icon: "cube-outline",
    title: "View product",
    description: "Open the listing attached to this chat.",
    tone: "default",
    action: (id: string) => {
      router.push({
        pathname: "/product-details/[id]",
        params: { id },
      });
    },
  },
  {
    icon: "notifications-outline",
    title: "Mute conversation",
    description: "Pause message alerts from this seller.",
    tone: "default",
  },
  {
    icon: "flag-outline",
    title: "Report seller",
    description: "Tell us if something feels suspicious.",
    tone: "warning",
  },
  {
    icon: "trash-outline",
    title: "Delete conversation",
    description: "Remove this chat from your inbox.",
    tone: "danger",
  },
];

export default function MessageDetailsScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { user } = useAuth();
  const toast = useToast();
  const scrollViewRef = useRef<ScrollView>(null);
  const imageViewerRef = useRef<ScrollView>(null);
  const messageInputRef = useRef<TextInput>(null);
  const [message, setMessage] = useState("");
  const [actionsOpen, setActionsOpen] = useState(false);
  const [offerOpen, setOfferOpen] = useState(false);
  const [buyNowOpen, setBuyNowOpen] = useState(false);
  const [offerAmount, setOfferAmount] = useState("");
  const [offerQuantity, setOfferQuantity] = useState(1);
  const [buyQuantity, setBuyQuantity] = useState(1);
  const [conversation, setConversation] = useState<ChatConversation | null>(
    null,
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingConversation, setLoadingConversation] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendingImage, setSendingImage] = useState(false);
  const [pendingImageUris, setPendingImageUris] = useState<string[]>([]);
  const [viewingImageUrls, setViewingImageUrls] = useState<string[]>([]);
  const [viewingImageIndex, setViewingImageIndex] = useState(0);
  const [imageViewerWidth, setImageViewerWidth] = useState(0);
  const [counterpartOnline, setCounterpartOnline] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const params = useLocalSearchParams<{
    id?: string;
    conversationId?: string;
    counterpartId?: string;
    sellerId?: string;
    sellerName?: string;
    productName?: string;
    productPrice?: string;
    productId?: string;
    productQuantity?: string;
    isOwner?: string;
    productImage?: string;
  }>();

  const sellerName = params.sellerName || "Avera Seller";
  const productName = params.productName || "Product listing";
  const productPrice = params.productPrice || "Price available";
  const sellerInitial = sellerName.slice(0, 1).toUpperCase();
  const isOwnProduct = params.isOwner === "true";
  const currentUserId = user?.id ? Number(user.id) : null;
  const counterpartId = Number(params.counterpartId || params.id || 0);
  const routeSellerId = Number(params.sellerId || 0);
  const isSeller =
    Boolean(currentUserId) &&
    (conversation?.sellerId === currentUserId ||
      routeSellerId === currentUserId);
  const productNumericPrice =
    Number(String(productPrice).replace(/[^0-9.]/g, "")) || 0;
  const availableQuantity = Math.max(
    1,
    Number(conversation?.product?.quantity || params.productQuantity || 1),
  );
  const hasPendingImages = pendingImageUris.length > 0;
  const numericOfferAmount = Number(offerAmount.replace(/[^0-9.]/g, "")) || 0;
  const offerTotal = numericOfferAmount * offerQuantity;
  const buyTotal = productNumericPrice * buyQuantity;
  const offerPercent =
    productNumericPrice > 0 && numericOfferAmount > 0
      ? Math.round((numericOfferAmount / productNumericPrice) * 100)
      : null;
  const minimumOfferAmount =
    productNumericPrice > 0
      ? Math.ceil(productNumericPrice * (MIN_OFFER_PERCENT / 100))
      : 0;
  const isOfferTooLow =
    minimumOfferAmount > 0 &&
    numericOfferAmount > 0 &&
    numericOfferAmount < minimumOfferAmount;
  const suggestedOffers = useMemo(() => {
    if (!productNumericPrice) return [];

    return [0.9, 0.85, 0.8].map((multiplier) =>
      Math.round(productNumericPrice * multiplier),
    );
  }, [productNumericPrice]);

  const decrementOfferQuantity = () => {
    setOfferQuantity((current) => Math.max(1, current - 1));
  };

  const incrementOfferQuantity = () => {
    setOfferQuantity((current) => Math.min(availableQuantity, current + 1));
  };

  const decrementBuyQuantity = () => {
    setBuyQuantity((current) => Math.max(1, current - 1));
  };

  const incrementBuyQuantity = () => {
    setBuyQuantity((current) => Math.min(availableQuantity, current + 1));
  };
  const latestIncomingOffer = useMemo(() => {
    return messages
      .slice()
      .reverse()
      .find(
        (item) =>
          Boolean(item.offerAmount) &&
          item.senderId !== currentUserId &&
          (item.offerStatus || "PENDING") === "PENDING",
      );
  }, [currentUserId, messages]);

  const appendMessage = useCallback((nextMessage: ChatMessage) => {
    setMessages((current) => {
      if (current.some((item) => item.id === nextMessage.id)) return current;
      return [...current, nextMessage];
    });
  }, []);

  const replaceMessage = useCallback(
    (targetId: number, nextMessage: ChatMessage) => {
      setMessages((current) => {
        if (current.some((item) => item.id === nextMessage.id)) {
          return current.filter((item) => item.id !== targetId);
        }

        return current.map((item) =>
          item.id === targetId ? nextMessage : item,
        );
      });
    },
    [],
  );

  const updateMessage = useCallback((nextMessage: ChatMessage) => {
    setMessages((current) =>
      current.map((item) => (item.id === nextMessage.id ? nextMessage : item)),
    );
  }, []);

  const getMediaUrl = (path?: string | null) => {
    if (!path) return null;
    if (/^https?:\/\//i.test(path)) return path;
    return `${BASE_URL}/media/${path}`;
  };

  const formatMessageTime = (createdAt: string) =>
    new Date(createdAt).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

  const getMessageStatus = (item: ChatMessage) => {
    if (item.localStatus === "failed") return "Failed";
    if (item.localStatus === "sending") return "Sending";
    if (item.readAt) return "Seen";
    if (item.deliveredAt || item.createdAt) return "Delivered";
    return "Sent";
  };

  const scrollToBottom = useCallback((animated = true) => {
    requestAnimationFrame(() => {
      scrollViewRef.current?.scrollToEnd({ animated });
    });
  }, []);

  useEffect(() => {
    if (!loadingConversation && messages.length > 0) {
      scrollToBottom();
    }
  }, [loadingConversation, messages.length, scrollToBottom]);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSubscription = Keyboard.addListener(showEvent, () => {
      setKeyboardVisible(true);
      setTimeout(() => scrollToBottom(), 80);
      setTimeout(() => scrollToBottom(), 260);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardVisible(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [scrollToBottom]);

  useEffect(() => {
    let isMounted = true;
    let activeConversationId: number | null = null;
    const productId = Number(params.productId || 0);
    const routeConversationId = Number(params.conversationId || params.id || 0);

    const setupConversation = async () => {
      if (isOwnProduct && !routeConversationId) {
        setLoadingConversation(false);
        return;
      }

      try {
        setLoadingConversation(true);

        let conversationId = routeConversationId;

        if (!conversationId && productId) {
          const { data } = await axiosInstance.post("/chat/conversations", {
            productId,
          });

          if (!isMounted) return;
          setConversation(data);
          conversationId = data.id;
        } else if (conversationId) {
          setConversation({
            id: conversationId,
            sellerId: routeSellerId || undefined,
            productId: Number(params.productId || 0),
          });
        }

        if (!conversationId) {
          throw new Error("Conversation not available");
        }

        activeConversationId = conversationId;

        const { data: loadedMessages } = await axiosInstance.get(
          `/chat/conversations/${conversationId}/messages`,
        );

        if (!isMounted) return;
        setMessages(loadedMessages);

        const socket = connectSocket();
        const handleNewMessage = (nextMessage: ChatMessage) => {
          if (nextMessage.conversationId !== activeConversationId) return;
          if (nextMessage.senderId === currentUserId) return;
          appendMessage(nextMessage);

          socket.emit("conversation:read", { conversationId });
        };
        const handlePresenceSnapshot = (payload: {
          onlineUserIds?: number[];
        }) => {
          setCounterpartOnline(
            Boolean(
              counterpartId &&
              payload.onlineUserIds?.some(
                (userId) => Number(userId) === counterpartId,
              ),
            ),
          );
        };
        const handlePresenceUpdate = (payload: {
          userId?: number;
          online?: boolean;
        }) => {
          if (Number(payload.userId) === counterpartId) {
            setCounterpartOnline(Boolean(payload.online));
          }
        };
        const handleReadState = (payload: {
          conversationId?: number;
          readerId?: number;
          readAt?: string;
        }) => {
          if (Number(payload.conversationId) !== activeConversationId) return;
          const readAt = payload.readAt || new Date().toISOString();
          setMessages((current) =>
            current.map((item) =>
              item.senderId !== payload.readerId && !item.readAt
                ? { ...item, readAt }
                : item,
            ),
          );
        };
        const handleOfferUpdated = (payload: {
          conversationId?: number;
          offer?: ChatMessage;
        }) => {
          if (Number(payload.conversationId) !== activeConversationId) return;
          if (!payload.offer) return;
          updateMessage(payload.offer);
        };

        socket.emit("conversation:join", { conversationId });
        socket.emit("conversation:read", { conversationId });
        socket.on("message:new", handleNewMessage);
        socket.on("presence:snapshot", handlePresenceSnapshot);
        socket.on("presence:update", handlePresenceUpdate);
        socket.on("conversation:read", handleReadState);
        socket.on("offer:updated", handleOfferUpdated);

        return () => {
          socket.off("message:new", handleNewMessage);
          socket.off("presence:snapshot", handlePresenceSnapshot);
          socket.off("presence:update", handlePresenceUpdate);
          socket.off("conversation:read", handleReadState);
          socket.off("offer:updated", handleOfferUpdated);
        };
      } catch (error: any) {
        toast.show({
          title: "Chat unavailable",
          description:
            error?.response?.data?.message ||
            "We couldn't open this conversation right now.",
          variant: "error",
        });
      } finally {
        if (isMounted) setLoadingConversation(false);
      }
    };

    let cleanupSocket: (() => void) | undefined;
    setupConversation().then((cleanup) => {
      cleanupSocket = cleanup;
    });

    return () => {
      isMounted = false;
      cleanupSocket?.();
    };
  }, [
    appendMessage,
    isOwnProduct,
    counterpartId,
    currentUserId,
    params.conversationId,
    params.id,
    params.productId,
    routeSellerId,
    toast,
    updateMessage,
  ]);

  const openSellerProfile = () => {
    router.push({
      pathname: "/seller/[id]",
      params: {
        id: params.id || "seller",
        sellerName,
        productName,
        productPrice,
        ...(params.productImage ? { productImage: params.productImage } : {}),
      },
    });
  };

  const useQuickReply = (reply: string) => {
    setMessage(reply);
    requestAnimationFrame(() => {
      messageInputRef.current?.focus();
      scrollToBottom();
    });
  };

  const sendChatMessage = async (
    input: SendChatMessageInput,
  ): Promise<ChatMessage> => {
    if (!conversation?.id) throw new Error("Conversation not available");

    const payload = {
      conversationId: conversation.id,
      ...input,
    };

    const sendWithRest = async () => {
      const { data } = await axiosInstance.post(
        `/chat/conversations/${conversation.id}/messages`,
        input,
      );
      return data as ChatMessage;
    };

    try {
      const socket = connectSocket();
      const clientRequestId = `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}`;
      const response = await new Promise<{
        ok?: boolean;
        message?: ChatMessage | string;
      }>((resolve, reject) => {
        const timeout = setTimeout(() => {
          socket.off("message:sent", handleSent);
          reject(new Error("Socket send timed out"));
        }, 8000);

        const handleSent = (nextResponse: any) => {
          if (nextResponse?.clientRequestId !== clientRequestId) return;
          clearTimeout(timeout);
          socket.off("message:sent", handleSent);
          resolve(nextResponse);
        };

        socket.on("message:sent", handleSent);
        socket.emit("message:send", {
          ...payload,
          clientRequestId,
        });
      });

      if (
        !response?.ok ||
        typeof response.message === "string" ||
        !response.message
      ) {
        throw new Error(
          typeof response?.message === "string"
            ? response.message
            : "Message not sent",
        );
      }

      return response.message;
    } catch {
      console.log("Falling back to REST for sending message");
      return sendWithRest();
    }
  };

  const respondToOfferRequest = async (
    offerMessageId: number,
    accepted: boolean,
  ): Promise<{ offer: ChatMessage; message: ChatMessage }> => {
    if (!conversation?.id) throw new Error("Conversation not available");

    const respondWithRest = async () => {
      const { data } = await axiosInstance.post(
        `/chat/conversations/${conversation.id}/offers/${offerMessageId}/respond`,
        { accepted },
      );
      return data as { offer: ChatMessage; message: ChatMessage };
    };

    try {
      const socket = connectSocket();
      const clientRequestId = `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}`;
      const response = await new Promise<{
        ok?: boolean;
        offer?: ChatMessage;
        message?: ChatMessage | string;
      }>((resolve, reject) => {
        const timeout = setTimeout(() => {
          socket.off("offer:responded", handleResponded);
          reject(new Error("Socket offer response timed out"));
        }, 8000);

        const handleResponded = (nextResponse: any) => {
          if (nextResponse?.clientRequestId !== clientRequestId) return;
          clearTimeout(timeout);
          socket.off("offer:responded", handleResponded);
          resolve(nextResponse);
        };

        socket.on("offer:responded", handleResponded);
        socket.emit("offer:respond", {
          clientRequestId,
          conversationId: conversation.id,
          offerMessageId,
          accepted,
        });
      });

      if (
        !response?.ok ||
        !response.offer ||
        typeof response.message === "string" ||
        !response.message
      ) {
        throw new Error(
          typeof response?.message === "string"
            ? response.message
            : "Offer response not sent",
        );
      }

      return { offer: response.offer, message: response.message };
    } catch {
      return respondWithRest();
    }
  };

  const createOptimisticMessage = (
    input: SendChatMessageInput,
  ): ChatMessage => ({
    id: -Date.now() - Math.round(Math.random() * 10000),
    conversationId: Number(conversation?.id || 0),
    senderId: Number(currentUserId || 0),
    senderName: (user as any)?.username || (user as any)?.firstName || "You",
    content: input.content,
    imageUrl: input.imageUrl,
    offerAmount: input.offerAmount || null,
    offerQuantity: input.offerQuantity || null,
    offerStatus: input.offerAmount ? "PENDING" : null,
    createdAt: new Date().toISOString(),
    localStatus: "sending",
  });

  const markOptimisticMessageFailed = (messageId: number) => {
    setMessages((current) =>
      current.map((item) =>
        item.id === messageId ? { ...item, localStatus: "failed" } : item,
      ),
    );
  };

  const sendMessage = async () => {
    const trimmed = message.trim();
    if ((!trimmed && !hasPendingImages) || !conversation?.id || sending) return;

    const imageUris = pendingImageUris;

    try {
      setSending(true);
      if (imageUris.length) setSendingImage(true);
      setMessage("");
      setPendingImageUris([]);

      const imageUrls = imageUris.length
        ? await uploadChatImages(imageUris)
        : [];
      if (imageUris.length && imageUrls.length !== imageUris.length) {
        throw new Error("Image upload failed");
      }

      if (imageUrls.length) {
        for (let index = 0; index < imageUrls.length; index += 1) {
          const payload = {
            content: index === 0 ? trimmed : "",
            imageUrl: imageUrls[index],
          };
          const optimisticMessage = createOptimisticMessage(payload);
          appendMessage(optimisticMessage);
          try {
            const data = await sendChatMessage(payload);
            replaceMessage(optimisticMessage.id, data);
          } catch (error) {
            markOptimisticMessageFailed(optimisticMessage.id);
            throw error;
          }
        }
      } else {
        const payload = { content: trimmed };
        const optimisticMessage = createOptimisticMessage(payload);
        appendMessage(optimisticMessage);
        try {
          const data = await sendChatMessage(payload);
          replaceMessage(optimisticMessage.id, data);
        } catch (error) {
          markOptimisticMessageFailed(optimisticMessage.id);
          throw error;
        }
      }
    } catch (error: any) {
      setMessage(trimmed);
      setPendingImageUris(imageUris);
      toast.show({
        title: "Message not sent",
        description:
          error?.response?.data?.message ||
          "Please check your connection and try again.",
        variant: "error",
      });
    } finally {
      setSending(false);
      setSendingImage(false);
    }
  };

  const uploadChatImages = async (uris: string[]) => {
    const formData = new FormData();
    uris.forEach((uri, index) => {
      formData.append("images", {
        uri,
        name: uri.split("/").pop() || `chat-image-${index + 1}.jpg`,
        type: "image/jpeg",
      } as unknown as Blob);
    });

    const { data } = await axiosInstance.post<{
      files: Array<{ path: string }>;
    }>("/uploads/images", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return data.files.map((file) => file.path).filter(Boolean);
  };

  const pickImageMessage = async () => {
    if (!conversation?.id || sendingImage) return;
    if (pendingImageUris.length >= MAX_CHAT_IMAGES) {
      toast.show({
        title: "Image limit reached",
        description: `You can send up to ${MAX_CHAT_IMAGES} images at once.`,
        variant: "error",
      });
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      toast.show({
        title: "Photos unavailable",
        description: "Allow photo access to send images in chat.",
        variant: "error",
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: Math.max(1, MAX_CHAT_IMAGES - pendingImageUris.length),
    });

    if (result.canceled) return;

    const pickedUris = result.assets
      .map((asset) => asset.uri)
      .filter(Boolean)
      .slice(0, MAX_CHAT_IMAGES - pendingImageUris.length);
    if (!pickedUris.length) return;

    setPendingImageUris((current) =>
      [...current, ...pickedUris].slice(0, MAX_CHAT_IMAGES),
    );
    setTimeout(() => scrollToBottom(), 80);
  };

  const removePendingImage = (index: number) => {
    setPendingImageUris((current) =>
      current.filter((_, itemIndex) => itemIndex !== index),
    );
  };

  const closeImageViewer = () => {
    setViewingImageUrls([]);
    setViewingImageIndex(0);
  };

  const openImageViewer = (urls: Array<string | null>, index = 0) => {
    const safeUrls = urls.filter(Boolean) as string[];
    if (!safeUrls.length) return;

    const safeIndex = Math.min(Math.max(index, 0), safeUrls.length - 1);
    setViewingImageUrls(safeUrls);
    setViewingImageIndex(safeIndex);
    requestAnimationFrame(() => {
      if (!imageViewerWidth) return;
      imageViewerRef.current?.scrollTo({
        x: safeIndex * imageViewerWidth,
        animated: false,
      });
    });
  };

  useEffect(() => {
    if (!viewingImageUrls.length || !imageViewerWidth) return;

    requestAnimationFrame(() => {
      imageViewerRef.current?.scrollTo({
        x: viewingImageIndex * imageViewerWidth,
        animated: false,
      });
    });
  }, [imageViewerWidth, viewingImageIndex, viewingImageUrls.length]);

  const formatOfferInput = (value: string) => {
    const numericValue = value.replace(/[^0-9]/g, "");
    setOfferAmount(numericValue);
  };

  const submitOffer = async () => {
    const amount = numericOfferAmount;
    if (!amount || !conversation?.id || sending) return;

    if (isOfferTooLow) {
      toast.show({
        title: "Offer too low",
        description: `Offer must be at least ${MIN_OFFER_PERCENT}% of the listed price.`,
        variant: "error",
      });
      return;
    }

    try {
      setSending(true);
      const payload = {
        content: `I would like to offer ₦${amount.toLocaleString()} x ${offerQuantity} for this item.`,
        offerAmount: amount,
        offerQuantity,
      };
      const optimisticMessage = createOptimisticMessage(payload);
      appendMessage(optimisticMessage);
      setOfferAmount("");
      setOfferQuantity(1);
      setOfferOpen(false);
      try {
        const data = await sendChatMessage(payload);
        replaceMessage(optimisticMessage.id, data);
      } catch (error) {
        markOptimisticMessageFailed(optimisticMessage.id);
        throw error;
      }
    } catch (error: any) {
      toast.show({
        title: "Offer not sent",
        description:
          error?.response?.data?.message || "Please check your connection.",
        variant: "error",
      });
    } finally {
      setSending(false);
    }
  };

  const respondToOffer = async (accepted: boolean) => {
    if (!latestIncomingOffer?.offerAmount || !conversation?.id || sending) {
      return;
    }

    const amount = Number(latestIncomingOffer.offerAmount);
    const quantity = Number(latestIncomingOffer.offerQuantity || 1);
    const total = amount * quantity;
    const content = accepted
      ? `Offer accepted: ₦${amount.toLocaleString()} x ${quantity} = ₦${total.toLocaleString()}.`
      : `Offer rejected: ₦${amount.toLocaleString()} x ${quantity}.`;

    try {
      setSending(true);
      const optimisticOffer = {
        ...latestIncomingOffer,
        offerStatus: accepted ? ("ACCEPTED" as const) : ("REJECTED" as const),
      };
      updateMessage(optimisticOffer);
      const optimisticMessage = createOptimisticMessage({ content });
      appendMessage(optimisticMessage);
      try {
        const data = await respondToOfferRequest(
          latestIncomingOffer.id,
          accepted,
        );
        updateMessage(data.offer);
        replaceMessage(optimisticMessage.id, data.message);
      } catch (error) {
        updateMessage(latestIncomingOffer);
        markOptimisticMessageFailed(optimisticMessage.id);
        throw error;
      }
    } catch (error: any) {
      toast.show({
        title: accepted ? "Offer not accepted" : "Offer not rejected",
        description:
          error?.response?.data?.message || "Please check your connection.",
        variant: "error",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#0A0A0A]" edges={["top"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <View className="border-b border-gray-100 bg-white px-4 pb-3 pt-3 dark:border-white/5 dark:bg-[#0A0A0A]">
          <View className="flex-row items-center">
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
                  className="text-base font-black text-brand"
                >
                  {sellerInitial}
                </Text>
                <View
                  className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-[#0A0A0A] ${
                    counterpartOnline ? "bg-emerald-500" : "bg-gray-300"
                  }`}
                />
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-base font-bold text-gray-950 dark:text-white">
                  {sellerName}
                </Text>
                <Text className="mt-0.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                  {counterpartOnline ? "Online" : "Offline"} • usually replies
                  fast
                </Text>
              </View>
            </Pressable>

            <Pressable className="mr-2 h-11 w-11 items-center justify-center rounded-full bg-gray-50 dark:bg-white/5">
              <Ionicons
                name="call-outline"
                size={20}
                color={isDark ? "white" : "#111827"}
              />
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
        </View>

        <ScrollView
          ref={scrollViewRef}
          className="flex-1"
          contentContainerClassName="px-4 pb-6 pt-4"
          contentContainerStyle={{
            paddingBottom: keyboardVisible ? 18 : 24,
          }}
          onContentSizeChange={() => scrollToBottom()}
          keyboardShouldPersistTaps="always"
          showsVerticalScrollIndicator={false}
        >
          <Pressable className="mb-3 flex-row rounded-[28px] border border-gray-100 bg-gray-50 p-3 dark:border-white/5 dark:bg-white/5">
            {params.productImage ? (
              <Image
                source={{ uri: params.productImage }}
                className="h-20 w-20 rounded-2xl bg-gray-200 dark:bg-white/10"
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
                <Text className="text-sm font-black text-brand">
                  {productPrice}
                </Text>
                <View className="ml-2 flex-row items-center rounded-full bg-brand/10 px-2 py-0.5">
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={12}
                    color="#2563EB"
                  />
                  <Text
                    variant="none"
                    className="ml-1 text-[10px] font-bold text-brand"
                  >
                    Escrow
                  </Text>
                </View>
              </View>
            </View>
            <View className="self-center">
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </View>
          </Pressable>

          <View className="mb-5 flex-row items-center justify-center px-2">
            <Ionicons
              name="information-circle-outline"
              size={15}
              color="#9CA3AF"
            />
            <Text className="ml-1.5 text-center text-xs leading-5 text-gray-500 dark:text-gray-400">
              Buy through Avera. Payment is protected by escrow.
            </Text>
          </View>

          {loadingConversation ? (
            <View className="items-center justify-center py-16">
              <ActivityIndicator color="#2563EB" />
              <Text className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                Opening chat...
              </Text>
            </View>
          ) : messages.length === 0 ? (
            <View className="items-center justify-center py-16">
              <View className="h-16 w-16 items-center justify-center rounded-full bg-brand/10">
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={24}
                  color="#2563EB"
                />
              </View>
              <Text className="mt-4 text-base font-bold text-gray-950 dark:text-white">
                Start the conversation
              </Text>
              <Text className="mt-1 text-center text-sm text-gray-500 dark:text-gray-400">
                Ask about the item, delivery, condition, or make an offer.
              </Text>
            </View>
          ) : (
            <View className="mb-5 items-center">
              <Text className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-500 dark:bg-white/5 dark:text-gray-400">
                Today
              </Text>
            </View>
          )}

          {messages.map((item, index) => {
            const previous = messages[index - 1];
            const itemFromMe = item.senderId === currentUserId;
            const isImageOnly = Boolean(item.imageUrl) && !item.content;
            const isImageBatchContinuation =
              isImageOnly &&
              previous?.senderId === item.senderId &&
              Boolean(previous.imageUrl) &&
              !previous.content;

            if (isImageBatchContinuation) return null;

            const imageBatch: ChatMessage[] = [];
            if (isImageOnly) {
              for (
                let batchIndex = index;
                batchIndex < messages.length;
                batchIndex += 1
              ) {
                const batchItem = messages[batchIndex];
                if (
                  batchItem.senderId !== item.senderId ||
                  !batchItem.imageUrl ||
                  batchItem.content
                ) {
                  break;
                }
                imageBatch.push(batchItem);
              }
            } else {
              imageBatch.push(item);
            }
            const imageBatchUrls = imageBatch.map((batchItem) =>
              getMediaUrl(batchItem.imageUrl),
            );
            const next = messages[index + imageBatch.length];
            const groupedBefore =
              previous && previous.senderId === item.senderId;
            const groupedAfter = next && next.senderId === item.senderId;
            const hasImage = Boolean(item.imageUrl);
            const hasText = Boolean(item.content);
            const isImageBatch = imageBatch.length > 1 && !hasText;
            const groupPosition =
              !groupedBefore && !groupedAfter
                ? "single"
                : !groupedBefore
                  ? "first"
                  : groupedAfter
                    ? "middle"
                    : "last";
            const bubbleRadius = itemFromMe
              ? {
                  single: "rounded-[24px] rounded-br-md",
                  first: "rounded-[24px] rounded-br-md",
                  middle: "rounded-[24px] rounded-r-md",
                  last: "rounded-[24px] rounded-tr-md",
                }[groupPosition]
              : {
                  single: "rounded-[24px] rounded-bl-md",
                  first: "rounded-[24px] rounded-bl-md",
                  middle: "rounded-[24px] rounded-l-md",
                  last: "rounded-[24px] rounded-tl-md",
                }[groupPosition];
            const imageRadius = hasText
              ? "rounded-[20px] rounded-b"
              : itemFromMe
                ? {
                    single: "rounded-[20px] rounded-br",
                    first: "rounded-[20px] rounded-br",
                    middle: "rounded-[20px] rounded-r",
                    last: "rounded-[20px] rounded-tr",
                  }[groupPosition]
                : {
                    single: "rounded-[20px] rounded-bl",
                    first: "rounded-[20px] rounded-bl",
                    middle: "rounded-[20px] rounded-l",
                    last: "rounded-[20px] rounded-tl",
                  }[groupPosition];

            return (
              <View
                key={item.id}
                className={`mb-2 ${
                  isImageBatch ? "max-w-[92%]" : "max-w-[84%]"
                } ${
                  itemFromMe ? "self-end items-end" : "self-start items-start"
                } ${groupedBefore ? "mt-0" : "mt-3"}`}
              >
                {!itemFromMe && !groupedBefore && (
                  <Text className="mb-1 ml-1 text-xs font-semibold text-gray-400">
                    {item.senderName || sellerName}
                  </Text>
                )}
                <View
                  className={`${bubbleRadius} ${
                    hasImage ? "p-1" : "px-4 py-3"
                  } ${
                    itemFromMe ? "bg-brand" : "bg-gray-100 dark:bg-white/10"
                  }`}
                >
                  {item.imageUrl ? (
                    isImageBatch ? (
                      <View className="w-[244px] flex-row flex-wrap">
                        {imageBatch.slice(0, 4).map((batchItem, batchIndex) => {
                          const mediaUrl = imageBatchUrls[batchIndex];
                          const hiddenCount = imageBatch.length - 4;

                          return (
                            <Pressable
                              key={batchItem.id}
                              onPress={() =>
                                openImageViewer(imageBatchUrls, batchIndex)
                              }
                              className="relative"
                            >
                              <Image
                                source={{ uri: mediaUrl || undefined }}
                                className={`h-[120px] w-[120px] bg-gray-200 dark:bg-white/10 ${
                                  batchIndex % 2 === 0 ? "mr-1" : ""
                                } ${batchIndex < 2 ? "mb-1" : ""} ${
                                  batchIndex === 0 ? "rounded-tl-[20px]" : ""
                                } ${
                                  batchIndex === 1 ||
                                  (imageBatch.length === 1 && batchIndex === 0)
                                    ? "rounded-tr-[20px]"
                                    : ""
                                } ${
                                  batchIndex === 2 ||
                                  (imageBatch.length === 2 && batchIndex === 0)
                                    ? "rounded-bl-[20px]"
                                    : ""
                                } ${
                                  batchIndex === 3 ||
                                  (imageBatch.length <= 3 &&
                                    batchIndex === imageBatch.length - 1)
                                    ? "rounded-br-[20px]"
                                    : ""
                                }`}
                                resizeMode="cover"
                              />
                              {batchIndex === 3 && hiddenCount > 0 ? (
                                <View className="absolute inset-0 items-center justify-center rounded-br-[20px] bg-black/45">
                                  <Text
                                    variant="none"
                                    className="text-lg font-black text-white"
                                  >
                                    +{hiddenCount}
                                  </Text>
                                </View>
                              ) : null}
                            </Pressable>
                          );
                        })}
                      </View>
                    ) : (
                      <Pressable
                        onPress={() =>
                          openImageViewer([getMediaUrl(item.imageUrl)])
                        }
                      >
                        <Image
                          source={{
                            uri: getMediaUrl(item.imageUrl) || undefined,
                          }}
                          className={`h-48 w-56 ${imageRadius} bg-gray-200 dark:bg-white/10 ${
                            hasText ? "mb-2" : ""
                          }`}
                          resizeMode="cover"
                        />
                      </Pressable>
                    )
                  ) : null}
                  {hasText ? (
                    <Text
                      variant="none"
                      className={`text-sm leading-5 ${
                        hasImage ? "px-3 pb-2 pt-1" : ""
                      } ${
                        itemFromMe
                          ? "text-white"
                          : "text-gray-900 dark:text-white"
                      }`}
                    >
                      {item.content}
                    </Text>
                  ) : null}
                  {item.offerAmount ? (
                    <View
                      className={`mx-3 mt-2 self-start rounded-full px-2.5 py-1 ${
                        item.offerStatus === "ACCEPTED"
                          ? "bg-emerald-500/15"
                          : item.offerStatus === "REJECTED"
                            ? "bg-red-500/15"
                            : itemFromMe
                              ? "bg-white/15"
                              : "bg-brand/10"
                      }`}
                    >
                      <Text
                        variant="none"
                        className={`text-[10px] font-black uppercase ${
                          item.offerStatus === "ACCEPTED"
                            ? "text-emerald-500"
                            : item.offerStatus === "REJECTED"
                              ? "text-red-500"
                              : itemFromMe
                                ? "text-white"
                                : "text-brand"
                        }`}
                      >
                        {item.offerStatus === "ACCEPTED"
                          ? "Accepted"
                          : item.offerStatus === "REJECTED"
                            ? "Rejected"
                            : "Pending offer"}
                      </Text>
                    </View>
                  ) : null}
                </View>
                {!groupedAfter && (
                  <View
                    className={`mt-1 flex-row items-center ${
                      itemFromMe ? "justify-end" : "justify-start"
                    }`}
                  >
                    <Text className="text-[11px] text-gray-400">
                      {formatMessageTime(item.createdAt)}
                    </Text>
                    {itemFromMe && (
                      <>
                        <Text className="mx-1 text-[11px] text-gray-400">
                          •
                        </Text>
                        <Ionicons
                          name="checkmark-done"
                          size={13}
                          color="#9CA3AF"
                        />
                        <Text className="ml-1 text-[11px] text-gray-400">
                          {getMessageStatus(item)}
                        </Text>
                      </>
                    )}
                  </View>
                )}
              </View>
            );
          })}

          <View className="mt-8">
            <Text className="mb-2 text-xs font-bold uppercase tracking-widest text-gray-400">
              Quick replies
            </Text>
            <ScrollView
              horizontal
              keyboardShouldPersistTaps="always"
              showsHorizontalScrollIndicator={false}
            >
              <View className="flex-row pr-4">
                {quickReplies.map((reply) => (
                  <Pressable
                    key={reply}
                    onPress={() => useQuickReply(reply)}
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
        </ScrollView>

        <View className="border-t border-gray-100 bg-white px-4 pb-4 pt-3 dark:border-white/5 dark:bg-[#0A0A0A]">
          {isSeller ? (
            latestIncomingOffer?.offerAmount ? (
              <View className="mb-3 rounded-3xl border border-brand/20 bg-brand/10 p-4">
                <View className="flex-row items-start">
                  <View className="h-10 w-10 items-center justify-center rounded-2xl bg-brand/10">
                    <Ionicons
                      name="pricetag-outline"
                      size={20}
                      color="#2563EB"
                    />
                  </View>
                  <View className="ml-3 flex-1">
                    <Text
                      variant="none"
                      className="text-xs font-bold uppercase tracking-widest text-brand"
                    >
                      Buyer offer
                    </Text>
                    <Text className="mt-1 text-2xl font-black text-gray-950 dark:text-white">
                      ₦
                      {Number(latestIncomingOffer.offerAmount).toLocaleString()}
                    </Text>
                    <Text className="mt-1 text-sm font-bold text-gray-700 dark:text-gray-200">
                      Qty {latestIncomingOffer.offerQuantity || 1} • Total ₦
                      {(
                        Number(latestIncomingOffer.offerAmount) *
                        Number(latestIncomingOffer.offerQuantity || 1)
                      ).toLocaleString()}
                    </Text>
                    <Text className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Accept or reject this offer. Order creation comes later.
                    </Text>
                  </View>
                </View>
                <View className="mt-4 flex-row gap-3">
                  <Pressable
                    onPress={() => respondToOffer(false)}
                    disabled={sending}
                    className="h-8 flex-1 flex-row items-center justify-center rounded-lg border border-red-500/20 bg-red-500/10"
                  >
                    <Ionicons name="close" size={14} color="#EF4444" />
                    <Text
                      variant="none"
                      className="ml-2 font-bold text-sm text-red-500"
                    >
                      Reject
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => respondToOffer(true)}
                    disabled={sending}
                    className="h-8 flex-1 flex-row items-center justify-center rounded-lg bg-emerald-500"
                  >
                    <Ionicons name="checkmark" size={14} color="white" />
                    <Text
                      variant="none"
                      className="ml-2 text-sm font-bold text-white"
                    >
                      Accept
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : null
          ) : (
            <View className="mb-3 flex-row gap-2">
              <Pressable
                onPress={() => setOfferOpen(true)}
                disabled={!conversation?.id || loadingConversation}
                className={`flex-1 items-center justify-center rounded-2xl py-3 ${
                  conversation?.id && !loadingConversation
                    ? "bg-gray-50 dark:bg-white/5"
                    : "bg-gray-100 opacity-60 dark:bg-white/5"
                }`}
              >
                <Text className="text-xs font-bold text-gray-600 dark:text-gray-300">
                  Offer price
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  if (isOwnProduct) return;

                  setBuyNowOpen(true);
                }}
                disabled={isOwnProduct}
                className={`flex-1 items-center justify-center rounded-2xl py-3 ${
                  isOwnProduct ? "bg-gray-100 dark:bg-white/5" : "bg-brand/10"
                }`}
              >
                <Text
                  variant="none"
                  className={`text-xs font-bold ${
                    isOwnProduct
                      ? "text-gray-500 dark:text-gray-400"
                      : "text-brand"
                  }`}
                >
                  {isOwnProduct ? "Your listing" : "Buy now"}
                </Text>
              </Pressable>
            </View>
          )}

          {hasPendingImages ? (
            <View className="mb-3 rounded-3xl border border-gray-100 bg-gray-50 p-3 dark:border-white/10 dark:bg-white/5">
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row gap-3 pr-4">
                  {pendingImageUris.map((uri, index) => (
                    <Pressable
                      key={`${uri}-${index}`}
                      onPress={() => openImageViewer(pendingImageUris, index)}
                      className="relative"
                    >
                      <Image
                        source={{ uri }}
                        className="h-20 w-20 rounded-2xl bg-gray-200 dark:bg-white/10"
                        resizeMode="cover"
                      />
                      <Pressable
                        onPress={() => removePendingImage(index)}
                        disabled={sendingImage}
                        className="absolute right-1 top-1 h-7 w-7 items-center justify-center rounded-full bg-black/70"
                      >
                        <Ionicons name="close" size={15} color="white" />
                      </Pressable>
                    </Pressable>
                  ))}
                  {pendingImageUris.length < MAX_CHAT_IMAGES ? (
                    <Pressable
                      onPress={pickImageMessage}
                      disabled={sendingImage}
                      className="h-20 w-20 items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white dark:border-white/20 dark:bg-white/10"
                    >
                      <Ionicons
                        name="add"
                        size={22}
                        color={isDark ? "white" : "#111827"}
                      />
                    </Pressable>
                  ) : null}
                </View>
              </ScrollView>
              <View className="mt-3 flex-row items-center justify-between">
                <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                  {pendingImageUris.length}/{MAX_CHAT_IMAGES} selected
                </Text>
                <Pressable
                  onPress={() => setPendingImageUris([])}
                  disabled={sendingImage}
                >
                  <Text
                    variant="none"
                    className="text-xs font-bold text-red-500"
                  >
                    Clear
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          <View className="flex-row items-end justify-center rounded-3xl border border-gray-100 bg-gray-50 px-3 py-2 dark:border-white/10 dark:bg-white/5">
            <Pressable
              onPress={pickImageMessage}
              disabled={!conversation?.id || sendingImage}
              className={`mb-1 h-10 w-10 items-center justify-center rounded-full ${
                sendingImage
                  ? "bg-gray-200 dark:bg-white/10"
                  : "bg-white dark:bg-white/10"
              }`}
            >
              {sendingImage ? (
                <ActivityIndicator size="small" color="#2563EB" />
              ) : (
                <Ionicons
                  name="add"
                  size={22}
                  color={isDark ? "white" : "#111827"}
                />
              )}
            </Pressable>
            <TextInput
              ref={messageInputRef}
              value={message}
              onChangeText={setMessage}
              onFocus={() => {
                setTimeout(() => scrollToBottom(), 80);
                setTimeout(() => scrollToBottom(), 260);
              }}
              placeholder="Message seller..."
              placeholderTextColor="#888"
              multiline
              className="max-h-28 flex-1 px-3 py-3 text-base text-gray-950 dark:text-white"
            />
            <Pressable
              onPress={sendMessage}
              disabled={
                (!message.trim() && !hasPendingImages) ||
                !conversation?.id ||
                sending
              }
              className={`mb-1 h-10 w-10 items-center justify-center rounded-full ${
                (message.trim() || hasPendingImages) &&
                conversation?.id &&
                !sending
                  ? "bg-brand"
                  : "bg-gray-200 dark:bg-white/10"
              }`}
            >
              <Ionicons
                name="send"
                size={18}
                color={
                  (message.trim() || hasPendingImages) &&
                  conversation?.id &&
                  !sending
                    ? "white"
                    : isDark
                      ? "#9CA3AF"
                      : "#6B7280"
                }
              />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>

      <Modal
        visible={Boolean(viewingImageUrls.length)}
        transparent
        animationType="fade"
        onRequestClose={closeImageViewer}
      >
        <View className="flex-1 bg-black">
          <SafeAreaView className="flex-1 flex-col">
            <View className="flex-row items-center justify-between px-4 py-3">
              <Pressable
                onPress={closeImageViewer}
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
            <View
              onLayout={(event) =>
                setImageViewerWidth(event.nativeEvent.layout.width)
              }
              className="flex-1 items-center justify-center px-4 pb-10"
            >
              {viewingImageUrls.length ? (
                <View className="h-full max-h-[86%] w-full items-center justify-center">
                  <ScrollView
                    ref={imageViewerRef}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    scrollEventThrottle={16}
                    onMomentumScrollEnd={(event) => {
                      if (!imageViewerWidth) return;
                      const nextIndex = Math.round(
                        event.nativeEvent.contentOffset.x / imageViewerWidth,
                      );
                      setViewingImageIndex(
                        Math.min(
                          Math.max(nextIndex, 0),
                          viewingImageUrls.length - 1,
                        ),
                      );
                    }}
                  >
                    {viewingImageUrls.map((url, index) => (
                      <View
                        key={`${url}-${index}`}
                        className="h-full items-center justify-center"
                        style={{ width: imageViewerWidth || 1 }}
                      >
                        <Image
                          source={{ uri: url }}
                          className="h-full w-full"
                          resizeMode="contain"
                        />
                      </View>
                    ))}
                  </ScrollView>
                </View>
              ) : null}
            </View>
          </SafeAreaView>
        </View>
      </Modal>

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
              onPress={() => {
                setActionsOpen(false);
                item.action?.(String(params.productId || params.id || ""));
              }}
              className={`flex-row items-center rounded-3xl border p-4 ${
                item.tone === "danger"
                  ? "border-red-500/10 bg-red-500/5"
                  : item.tone === "warning"
                    ? "border-yellow-500/10 bg-yellow-500/5"
                    : "border-gray-100 bg-gray-50 dark:border-white/10 dark:bg-white/5"
              }`}
            >
              <View
                className={`h-11 w-11 items-center justify-center rounded-2xl ${
                  item.tone === "danger"
                    ? "bg-red-500/10"
                    : item.tone === "warning"
                      ? "bg-yellow-500/10"
                      : "bg-white dark:bg-white/10"
                }`}
              >
                <Ionicons
                  name={item.icon as any}
                  size={21}
                  color={
                    item.tone === "danger"
                      ? "#EF4444"
                      : item.tone === "warning"
                        ? "#D97706"
                        : isDark
                          ? "white"
                          : "#111827"
                  }
                />
              </View>
              <View className="ml-3 flex-1">
                <Text className="font-bold text-gray-950 dark:text-white">
                  {item.title}
                </Text>
                <Text className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">
                  {item.description}
                </Text>
              </View>
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
          <View className="border-b border-gray-100 pb-4 dark:border-white/10">
            <Text className="text-xs font-bold uppercase tracking-widest text-gray-400">
              Listed price
            </Text>
            <Text className="mt-1 text-2xl font-black text-gray-950 dark:text-white">
              {productPrice}
            </Text>
          </View>

          <View className="mt-5">
            <Text className="text-base font-bold text-gray-950 dark:text-white">
              Your offer
            </Text>
            <View className="mt-3 flex-row items-center rounded-3xl border border-brand/20 bg-brand/10 px-4">
              <Text variant="none" className="text-2xl font-black text-brand">
                ₦
              </Text>
              <TextInput
                value={offerAmount}
                onChangeText={formatOfferInput}
                keyboardType="numeric"
                placeholder="Enter amount"
                placeholderTextColor="#888"
                className="h-16 flex-1 px-3 text-2xl font-black text-gray-950 dark:text-white"
              />
            </View>
            {offerPercent ? (
              <Text
                className={`mt-2 text-xs ${
                  isOfferTooLow
                    ? "text-red-500"
                    : "text-gray-500 dark:text-gray-400"
                }`}
              >
                {isOfferTooLow
                  ? `Minimum offer is ₦${minimumOfferAmount.toLocaleString()} (${MIN_OFFER_PERCENT}% of listed price).`
                  : `Your offer is about ${offerPercent}% of the listed price.`}
              </Text>
            ) : (
              <Text className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Minimum offer is{" "}
                {minimumOfferAmount
                  ? `₦${minimumOfferAmount.toLocaleString()}`
                  : `${MIN_OFFER_PERCENT}% of the listed price`}
                .
              </Text>
            )}
          </View>

          {suggestedOffers.length > 0 && (
            <View className="mt-4 flex-row flex-wrap">
              {suggestedOffers.map((amount) => (
                <Pressable
                  key={amount}
                  onPress={() => setOfferAmount(String(amount))}
                  className="mb-2 mr-2 rounded-full bg-brand/10 px-4 py-2"
                >
                  <Text variant="none" className="text-xs font-bold text-brand">
                    ₦{amount.toLocaleString()}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          <View className="mt-5 rounded-3xl border border-gray-100 bg-gray-50 p-4 dark:border-white/5 dark:bg-white/5">
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
                  onPress={decrementOfferQuantity}
                  disabled={offerQuantity <= 1}
                  className={`h-10 w-10 items-center justify-center rounded-full ${
                    offerQuantity <= 1 ? "opacity-40" : ""
                  }`}
                >
                  <Ionicons
                    name="remove"
                    size={18}
                    color={isDark ? "white" : "#111827"}
                  />
                </Pressable>
                <Text className="min-w-10 text-center text-lg font-black text-gray-950 dark:text-white">
                  {offerQuantity}
                </Text>
                <Pressable
                  onPress={incrementOfferQuantity}
                  disabled={offerQuantity >= availableQuantity}
                  className={`h-10 w-10 items-center justify-center rounded-full bg-brand ${
                    offerQuantity >= availableQuantity ? "opacity-40" : ""
                  }`}
                >
                  <Ionicons name="add" size={18} color="white" />
                </Pressable>
              </View>
            </View>

            <View className="mt-4 border-t border-gray-100 pt-4 dark:border-white/10">
              <View className="flex-row items-center justify-between">
                <Text className="text-sm text-gray-500 dark:text-gray-400">
                  Total offer
                </Text>
                <Text className="text-xl font-black text-brand">
                  ₦{offerTotal.toLocaleString()}
                </Text>
              </View>
            </View>
          </View>

          <View className="mt-5 rounded-3xl border border-amber-500/20 bg-amber-500/10 p-4">
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
              disabled={
                !numericOfferAmount ||
                isOfferTooLow ||
                !conversation?.id ||
                sending
              }
              className={`h-14 flex-1 items-center justify-center rounded-2xl ${
                numericOfferAmount &&
                !isOfferTooLow &&
                conversation?.id &&
                !sending
                  ? "bg-brand"
                  : "bg-gray-300 dark:bg-white/10"
              }`}
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
        title="Buy now"
        subtitle="Start checkout from this listing. Escrow protection is included."
        onClose={() => setBuyNowOpen(false)}
      >
        <View>
          <View className="flex-row border-b border-gray-100 pb-4 dark:border-white/10">
            {params.productImage ? (
              <Image
                source={{ uri: params.productImage }}
                className="h-16 w-16 rounded-2xl bg-gray-200 dark:bg-white/10"
              />
            ) : (
              <View className="h-16 w-16 items-center justify-center rounded-2xl bg-brand/10">
                <Ionicons name="cube-outline" size={22} color="#2563EB" />
              </View>
            )}
            <View className="ml-3 flex-1 justify-center">
              <Text
                numberOfLines={2}
                className="font-bold text-gray-950 dark:text-white"
              >
                {productName}
              </Text>
              <Text className="mt-1 text-sm font-black text-brand">
                {productPrice}
              </Text>
            </View>
          </View>

          <View className="mt-5 flex-row items-start">
            <View className="h-10 w-10 items-center justify-center rounded-2xl bg-brand/10">
              <Ionicons
                name="shield-checkmark-outline"
                size={20}
                color="#2563EB"
              />
            </View>
            <View className="ml-3 flex-1">
              <Text className="font-bold text-gray-950 dark:text-white">
                Protected by escrow
              </Text>
              <Text className="mt-1 text-sm leading-5 text-gray-500 dark:text-gray-400">
                Payment is held until the item is delivered or handed off and
                confirmed.
              </Text>
            </View>
          </View>

          <View className="mt-5 rounded-3xl border border-gray-100 bg-gray-50 p-4 dark:border-white/5 dark:bg-white/5">
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
                <Text className="min-w-10 text-center text-lg font-black text-gray-950 dark:text-white">
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
                <Text className="text-xl font-black text-brand">
                  ₦{buyTotal.toLocaleString()}
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
              onPress={() => {
                setBuyNowOpen(false);
                if (params.productId) {
                  router.push({
                    pathname: "/product-details/[id]",
                    params: { id: params.productId },
                  });
                }
              }}
              className="h-14 flex-1 items-center justify-center rounded-2xl bg-brand"
            >
              <Text variant="none" className="font-bold text-white">
                Continue
              </Text>
            </Pressable>
          </View>
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}
