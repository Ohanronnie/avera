import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Keyboard, Platform, TextInput } from "react-native";

import type { ChatConversation, ChatMessage, CheckoutOrder } from "@/components/messages/chat-types";
import { axiosInstance } from "@/utils/axios";
import { connectSocket } from "@/utils/socket";
import { emitSocketAck } from "@/utils/socket-events";

import {
  createChatMessage,
  formatMessageTime,
  formatPrice,
  getAcceptedOfferForCheckout,
  getLatestCheckoutStatus,
  getLatestIncomingOffer,
  getLiveCheckoutStatus,
  getMediaUrl,
  getMessageStatus,
  isSameUserId,
  MAX_CHAT_IMAGES,
  MIN_OFFER_PERCENT,
  normalizeConversation,
  QUICK_REPLIES,
  SOCKET_ACK_TIMEOUT_MS,
  toNumericId,
  type GatewayConversationPayload,
} from "./message-details-utils";

const emitSocketWithAck = async <TResponse,>(
  event: string,
  payload: Record<string, unknown>,
): Promise<TResponse> => {
  const socket = connectSocket();

  return new Promise<TResponse>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Socket request timed out"));
    }, SOCKET_ACK_TIMEOUT_MS);

    socket.emit(event, payload, (response: TResponse) => {
      clearTimeout(timeout);
      resolve(response);
    });
  });
};

export function useMessageDetails({
  currentUserId,
  user,
  toast,
  messageInputRef,
  offerAmountInputRef,
  scrollToBottom,
}: {
  currentUserId?: number | null;
  user?: any;
  toast: {
    show: (payload: {
      title: string;
      description?: string;
      variant?: "error" | "success" | "info";
    }) => void;
  };
  messageInputRef: React.RefObject<TextInput | null>;
  offerAmountInputRef: React.RefObject<TextInput | null>;
  scrollToBottom: (animated?: boolean) => void;
}) {
  const params = useLocalSearchParams<{ id?: string }>();
  const conversationId = toNumericId(params.id);

  const [message, setMessage] = useState("");
  const [actionsOpen, setActionsOpen] = useState(false);
  const [offerOpen, setOfferOpen] = useState(false);
  const [buyNowOpen, setBuyNowOpen] = useState(false);
  const [offerAmount, setOfferAmount] = useState("");
  const [offerQuantity, setOfferQuantity] = useState(1);
  const [buyQuantity, setBuyQuantity] = useState(1);
  const [conversation, setConversation] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingConversation, setLoadingConversation] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendingImage, setSendingImage] = useState(false);
  const [pendingImageUris, setPendingImageUris] = useState<string[]>([]);
  const [viewingImageUrls, setViewingImageUrls] = useState<string[]>([]);
  const [viewingImageIndex, setViewingImageIndex] = useState(0);
  const [counterpartOnline] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [checkoutOrder, setCheckoutOrder] = useState<CheckoutOrder>(null);

  const counterpartName = conversation?.counterpart?.name || "Avera user";
  const sellerName = counterpartName;
  const productName = conversation?.product?.name || "Product listing";
  const productPrice = conversation?.product
    ? formatPrice(conversation.product.price)
    : "Price available";
  const productImage = conversation?.product?.imageUrl || null;
  const productId = conversation?.productId;
  const counterpartInitial = counterpartName.slice(0, 1).toUpperCase();
  const counterpartId = toNumericId(conversation?.counterpart?.id);
  const sellerId = toNumericId(conversation?.sellerId);
  const isSeller =
    Boolean(currentUserId) &&
    isSameUserId(conversation?.sellerId, currentUserId);
  const isOwnProduct = isSeller;
  const productNumericPrice = Number(conversation?.product?.price || 0);
  const availableQuantity = Math.max(1, Number(conversation?.product?.quantity || 1));
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

  const latestIncomingOffer = useMemo(
    () => getLatestIncomingOffer(messages, currentUserId),
    [currentUserId, messages],
  );
  const acceptedOfferForCheckout = useMemo(
    () => getAcceptedOfferForCheckout({ messages, currentUserId, isSeller }),
    [currentUserId, isSeller, messages],
  );
  const acceptedOfferQuantity = Number(acceptedOfferForCheckout?.offerQuantity || 1);
  const acceptedOfferUnitPrice = Number(acceptedOfferForCheckout?.offerAmount || 0);
  const acceptedOfferTotal = acceptedOfferUnitPrice * acceptedOfferQuantity;
  const latestCheckoutStatus = useMemo(() => getLatestCheckoutStatus(messages), [messages]);
  const liveCheckoutStatus = useMemo(
    () => getLiveCheckoutStatus(checkoutOrder, latestCheckoutStatus),
    [checkoutOrder, latestCheckoutStatus],
  );
  const buyerCheckoutStatus = useMemo(() => {
    if (!liveCheckoutStatus) return null;
    return liveCheckoutStatus.replace(/^Buyer is /i, "You are ").replace(/^Buyer /i, "You ");
  }, [liveCheckoutStatus]);
  const acceptedOfferPaid =
    Boolean(acceptedOfferForCheckout) &&
    (/payment confirmed/i.test(liveCheckoutStatus || "") ||
      ["PAID_IN_ESCROW", "SELLER_PREPARING", "SHIPPED", "DELIVERED", "COMPLETED"].includes(
        checkoutOrder?.status || "",
      ) ||
      checkoutOrder?.statusText === "Paid in escrow");
  const directCheckoutActive =
    !isSeller && !acceptedOfferForCheckout && Boolean(checkoutOrder || buyerCheckoutStatus);
  const directCheckoutPending = checkoutOrder?.status === "PENDING_TRANSFER";
  const directCheckoutPaid =
    ["PAID_IN_ESCROW", "SELLER_PREPARING", "SHIPPED", "DELIVERED", "COMPLETED"].includes(
      checkoutOrder?.status || "",
    ) || checkoutOrder?.statusText === "Paid in escrow";
  const directBuyLabel = isOwnProduct
    ? "Your listing"
    : directCheckoutPending
      ? "Continue checkout"
      : directCheckoutActive
        ? "View active order"
        : "Buy now";

  const appendMessage = useCallback((nextMessage: ChatMessage) => {
    setMessages((current) => {
      if (current.some((item) => item.id === nextMessage.id)) return current;
      return [...current, nextMessage];
    });
  }, []);

  const reconcileIncomingMessage = useCallback((nextMessage: ChatMessage) => {
    setMessages((current) => {
      if (current.some((item) => item.id === nextMessage.id)) {
        return current.map((item) =>
          item.id === nextMessage.id ? { ...item, ...nextMessage } : item,
        );
      }

      const optimisticIndex = current.findIndex(
        (item) =>
          item.localStatus === "sending" &&
          item.conversationId === nextMessage.conversationId &&
          item.senderId === nextMessage.senderId &&
          (item.imageUrl || null) === (nextMessage.imageUrl || null) &&
          (item.offerAmount || null) === (nextMessage.offerAmount || null),
      );

      if (optimisticIndex === -1) return [...current, nextMessage];

      const optimisticMessage = current[optimisticIndex];
      const updated = [...current];
      updated[optimisticIndex] = {
        ...nextMessage,
        content: nextMessage.content || optimisticMessage.content || "",
        offerQuantity: nextMessage.offerQuantity || optimisticMessage.offerQuantity || null,
      };
      return updated;
    });
  }, []);

  const updateMessage = useCallback((nextMessage: ChatMessage) => {
    setMessages((current) =>
      current.map((item) => (item.id === nextMessage.id ? nextMessage : item)),
    );
  }, []);

  useEffect(() => {
    if (!loadingConversation && messages.length > 0) {
      scrollToBottom();
    }
  }, [loadingConversation, messages.length, scrollToBottom]);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

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

    const setupConversation = async () => {
      try {
        setLoadingConversation(true);
        if (!conversationId) throw new Error("Conversation not available");

        activeConversationId = conversationId;
        const socket = connectSocket();
        await emitSocketWithAck<{ conversationId?: number; success?: boolean }>(
          "conversation:join",
          { conversationId },
        );
        const loadedConversation = await emitSocketWithAck<GatewayConversationPayload>(
          "conversations:get",
          { conversationId },
        );

        if (!isMounted) return;

        setConversation(
          normalizeConversation({
            payload: loadedConversation,
            fallbackConversationId: conversationId,
          }),
        );
        setMessages(
          (loadedConversation.messages || []).map((item) =>
            createChatMessage({ payload: item, conversationId }),
          ),
        );

        const handleIncoming = (payload: Record<string, any>) => {
          if (Number(payload.conversationId) !== activeConversationId) return;
          reconcileIncomingMessage(createChatMessage({ payload, conversationId }));
        };

        const handleOfferResponse = (payload: Record<string, any>) => {
          if (Number(payload.conversationId) !== activeConversationId) return;
          updateMessage(createChatMessage({ payload, conversationId }));
        };

        socket.on("conversation:newMessage", handleIncoming);
        socket.on("conversation:newOffer", handleIncoming);
        socket.on("conversation:offerResponse", handleOfferResponse);

        return () => {
          socket.off("conversation:newMessage", handleIncoming);
          socket.off("conversation:newOffer", handleIncoming);
          socket.off("conversation:offerResponse", handleOfferResponse);
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
  }, [conversationId, reconcileIncomingMessage, toast, updateMessage]);

  const refreshConversationCheckout = useCallback(async () => {
    if (!conversationId || !productId) {
      setCheckoutOrder(null);
      return;
    }

    try {
      const data = await emitSocketAck<{
        ok?: boolean;
        message?: string;
        order?: any;
      }>("checkout:get-current", "checkout:current", {
        productId,
        conversationId,
        offerMessageId: acceptedOfferForCheckout?.id,
        source: acceptedOfferForCheckout ? "offer" : "buy_now",
      });

      if (!data.ok) throw new Error(data.message || "Checkout unavailable");
      setCheckoutOrder(data.order || null);
    } catch {
      setCheckoutOrder(null);
    }
  }, [acceptedOfferForCheckout?.id, conversationId, productId]);

  useFocusEffect(
    useCallback(() => {
      refreshConversationCheckout();
    }, [refreshConversationCheckout]),
  );

  const useQuickReply = useCallback(
    (reply: string) => {
      setMessage(reply);
      requestAnimationFrame(() => {
        messageInputRef.current?.focus();
        scrollToBottom();
      });
    },
    [messageInputRef, scrollToBottom],
  );

  const createOptimisticMessage = useCallback(
    (input: {
      content: string;
      imageUrl?: string;
      offerAmount?: number;
      offerQuantity?: number;
    }) =>
      createChatMessage({
        payload: {
          id: -Date.now() - Math.round(Math.random() * 10000),
          conversationId: Number(conversation?.id || 0),
          senderId: Number(currentUserId || 0),
          senderName: user?.username || user?.firstName || "You",
          content: input.content,
          imageUrl: input.imageUrl,
          offerAmount: input.offerAmount || null,
          offerQuantity: input.offerQuantity || null,
          offerStatus: input.offerAmount ? "PENDING" : null,
          createdAt: new Date().toISOString(),
        },
        conversationId: conversation?.id,
        fallbackLocalStatus: "sending",
      }),
    [conversation?.id, currentUserId, user],
  );

  const markOptimisticMessageFailed = useCallback((messageId: number) => {
    setMessages((current) =>
      current.map((item) =>
        item.id === messageId ? { ...item, localStatus: "failed" } : item,
      ),
    );
  }, []);

  const sendChatMessage = useCallback(
    async (input: { content: string; imageUrl?: string }) => {
      if (!conversation?.id) throw new Error("Conversation not available");
      connectSocket().emit("conversation:message", {
        conversationId: conversation.id,
        content: input.content,
        imageUrl: input.imageUrl,
      });
    },
    [conversation?.id],
  );

  const sendMessage = useCallback(async () => {
    const trimmed = message.trim();
    if ((!trimmed && !hasPendingImages) || !conversation?.id || sending) return;

    const imageUris = pendingImageUris;

    try {
      setSending(true);
      if (imageUris.length) setSendingImage(true);
      setMessage("");
      setPendingImageUris([]);

      const imageUrls = imageUris.length ? await uploadChatImages(imageUris) : [];
      if (imageUris.length && imageUrls.length !== imageUris.length) {
        throw new Error("Image upload failed");
      }

      const payloads =
        imageUrls.length > 0
          ? imageUrls.map((imageUrl, index) => ({
              content: index === 0 ? trimmed : "",
              imageUrl,
            }))
          : [{ content: trimmed }];

      for (const payload of payloads) {
        const optimisticMessage = createOptimisticMessage(payload);
        appendMessage(optimisticMessage);
        try {
          await sendChatMessage(payload);
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
          error?.response?.data?.message || "Please check your connection and try again.",
        variant: "error",
      });
    } finally {
      setSending(false);
      setSendingImage(false);
    }
  }, [
    appendMessage,
    conversation?.id,
    createOptimisticMessage,
    hasPendingImages,
    markOptimisticMessageFailed,
    message,
    pendingImageUris,
    sendChatMessage,
    sending,
    toast,
  ]);

  const uploadChatImages = useCallback(async (uris: string[]) => {
    const formData = new FormData();
    uris.forEach((uri, index) => {
      formData.append("images", {
        uri,
        name: uri.split("/").pop() || `chat-image-${index + 1}.jpg`,
        type: "image/jpeg",
      } as unknown as Blob);
    });

    const { data } = await axiosInstance.post<{ files: Array<{ path: string }> }>(
      "/uploads/images",
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      },
    );

    return data.files.map((file) => file.path).filter(Boolean);
  }, []);

  const pickImageMessage = useCallback(async () => {
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

    setPendingImageUris((current) => [...current, ...pickedUris].slice(0, MAX_CHAT_IMAGES));
    setTimeout(() => scrollToBottom(), 80);
  }, [conversation?.id, pendingImageUris.length, scrollToBottom, sendingImage, toast]);

  const submitOffer = useCallback(async () => {
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
      offerAmountInputRef.current?.blur();
      Keyboard.dismiss();
      appendMessage(
        createOptimisticMessage({
          content: `I would like to offer ₦${amount.toLocaleString()} x ${offerQuantity} for this item.`,
          offerAmount: amount,
          offerQuantity,
        }),
      );
      setOfferAmount("");
      setOfferQuantity(1);
      setOfferOpen(false);
      connectSocket().emit("conversation:offer", {
        conversationId: conversation.id,
        offerAmount: amount,
        offerQuantity,
      });
    } catch (error: any) {
      toast.show({
        title: "Offer not sent",
        description: error?.response?.data?.message || "Please check your connection.",
        variant: "error",
      });
    } finally {
      setSending(false);
    }
  }, [
    appendMessage,
    conversation?.id,
    createOptimisticMessage,
    isOfferTooLow,
    numericOfferAmount,
    offerAmountInputRef,
    offerQuantity,
    sending,
    toast,
  ]);

  const respondToOffer = useCallback(async (accepted: boolean) => {
    if (!latestIncomingOffer?.offerAmount || !conversation?.id || sending) return;

    try {
      setSending(true);
      updateMessage({
        ...latestIncomingOffer,
        offerStatus: accepted ? "ACCEPTED" : "REJECTED",
      });
      connectSocket().emit("conversation:offerResponse", {
        conversationId: conversation.id,
        offerId: latestIncomingOffer.id,
        response: accepted ? "accept" : "reject",
      });
    } catch (error: any) {
      updateMessage(latestIncomingOffer);
      toast.show({
        title: accepted ? "Offer not accepted" : "Offer not rejected",
        description: error?.response?.data?.message || "Please check your connection.",
        variant: "error",
      });
    } finally {
      setSending(false);
    }
  }, [conversation?.id, latestIncomingOffer, sending, toast, updateMessage]);

  return {
    state: {
      message,
      actionsOpen,
      offerOpen,
      buyNowOpen,
      offerAmount,
      offerQuantity,
      buyQuantity,
      conversation,
      messages,
      loadingConversation,
      sending,
      sendingImage,
      pendingImageUris,
      viewingImageUrls,
      viewingImageIndex,
      counterpartOnline,
      keyboardVisible,
      checkoutOrder,
    },
    derived: {
      conversationId,
      counterpartName,
      sellerName,
      productName,
      productPrice,
      productImage,
      productId,
      counterpartInitial,
      counterpartId,
      sellerId,
      isSeller,
      isOwnProduct,
      productNumericPrice,
      availableQuantity,
      hasPendingImages,
      numericOfferAmount,
      offerTotal,
      buyTotal,
      offerPercent,
      minimumOfferAmount,
      isOfferTooLow,
      suggestedOffers,
      latestIncomingOffer,
      acceptedOfferForCheckout,
      acceptedOfferQuantity,
      acceptedOfferUnitPrice,
      acceptedOfferTotal,
      liveCheckoutStatus,
      buyerCheckoutStatus,
      acceptedOfferPaid,
      directCheckoutActive,
      directCheckoutPending,
      directCheckoutPaid,
      directBuyLabel,
    },
    helpers: {
      quickReplies: QUICK_REPLIES,
      maxChatImages: MAX_CHAT_IMAGES,
      getMediaUrl,
      formatMessageTime,
      getMessageStatus,
      getMessageSenderName: (item: ChatMessage) => {
        if (isSameUserId(item.senderId, currentUserId)) return "You";
        if (item.senderName) return item.senderName;
        if (isSameUserId(item.senderId, counterpartId)) return counterpartName;
        if (isSameUserId(item.senderId, sellerId)) return sellerName;
        return "Avera user";
      },
    },
    actions: {
      setMessage,
      setActionsOpen,
      setOfferOpen,
      setBuyNowOpen,
      setOfferAmount,
      setOfferQuantity,
      setBuyQuantity,
      setPendingImageUris,
      setViewingImageUrls,
      setViewingImageIndex,
      useQuickReply,
      sendMessage,
      pickImageMessage,
      submitOffer,
      respondToOffer,
      refreshConversationCheckout,
      decrementOfferQuantity: () => setOfferQuantity((current) => Math.max(1, current - 1)),
      incrementOfferQuantity: () =>
        setOfferQuantity((current) => Math.min(availableQuantity, current + 1)),
      closeOfferSheet: () => {
        offerAmountInputRef.current?.blur();
        Keyboard.dismiss();
        setOfferOpen(false);
      },
      decrementBuyQuantity: () => setBuyQuantity((current) => Math.max(1, current - 1)),
      incrementBuyQuantity: () =>
        setBuyQuantity((current) => Math.min(availableQuantity, current + 1)),
      removePendingImage: (index: number) =>
        setPendingImageUris((current) =>
          current.filter((_, itemIndex) => itemIndex !== index),
        ),
      closeImageViewer: () => {
        setViewingImageUrls([]);
        setViewingImageIndex(0);
      },
      openImageViewer: (urls: Array<string | null>, index = 0) => {
        const safeUrls = urls.filter(Boolean) as string[];
        if (!safeUrls.length) return;
        setViewingImageUrls(safeUrls);
        setViewingImageIndex(Math.min(Math.max(index, 0), safeUrls.length - 1));
      },
      formatOfferInput: (value: string) => setOfferAmount(value.replace(/[^0-9]/g, "")),
    },
  };
}
