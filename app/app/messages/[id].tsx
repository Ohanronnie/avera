import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useColorScheme } from "nativewind";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
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
import { axiosInstance } from "@/utils/axios";
import { connectSocket } from "@/utils/socket";

const quickReplies = [
  "Is this still available?",
  "Can you share more photos?",
  "What is your last price?",
  "Can we use escrow?",
];

const MIN_OFFER_PERCENT = 80;

type ChatMessage = {
  id: number;
  conversationId: number;
  senderId: number;
  senderName?: string;
  content: string;
  offerAmount?: number | null;
  offerQuantity?: number | null;
  readAt?: string | null;
  deliveredAt?: string | null;
  createdAt: string;
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
  const [counterpartOnline, setCounterpartOnline] = useState(false);
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
    const latestOfferIndex = messages
      .map((item, index) => ({ item, index }))
      .reverse()
      .find(
        ({ item }) =>
          Boolean(item.offerAmount) && item.senderId !== currentUserId,
      )?.index;

    if (latestOfferIndex === undefined) return undefined;

    const hasSellerResponse = messages
      .slice(latestOfferIndex + 1)
      .some(
        (item) =>
          item.senderId === currentUserId &&
          (item.content.startsWith("Offer accepted:") ||
            item.content.startsWith("Offer rejected:")),
      );

    return hasSellerResponse ? undefined : messages[latestOfferIndex];
  }, [currentUserId, messages]);

  const appendMessage = useCallback((nextMessage: ChatMessage) => {
    setMessages((current) => {
      if (current.some((item) => item.id === nextMessage.id)) return current;
      return [...current, nextMessage];
    });
  }, []);

  const formatMessageTime = (createdAt: string) =>
    new Date(createdAt).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

  const getMessageStatus = (item: ChatMessage) => {
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
          appendMessage(nextMessage);

          if (nextMessage.senderId !== currentUserId) {
            socket.emit("conversation:read", { conversationId });
          }
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

        socket.emit("conversation:join", { conversationId });
        socket.emit("conversation:read", { conversationId });
        socket.on("message:new", handleNewMessage);
        socket.on("presence:snapshot", handlePresenceSnapshot);
        socket.on("presence:update", handlePresenceUpdate);
        socket.on("conversation:read", handleReadState);

        return () => {
          socket.off("message:new", handleNewMessage);
          socket.off("presence:snapshot", handlePresenceSnapshot);
          socket.off("presence:update", handlePresenceUpdate);
          socket.off("conversation:read", handleReadState);
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

  const sendMessage = async () => {
    const trimmed = message.trim();
    if (!trimmed || !conversation?.id || sending) return;

    try {
      setSending(true);
      setMessage("");
      const { data } = await axiosInstance.post(
        `/chat/conversations/${conversation.id}/messages`,
        { content: trimmed },
      );
      appendMessage(data);
    } catch (error: any) {
      setMessage(trimmed);
      toast.show({
        title: "Message not sent",
        description:
          error?.response?.data?.message || "Please check your connection.",
        variant: "error",
      });
    } finally {
      setSending(false);
    }
  };

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
      const { data } = await axiosInstance.post(
        `/chat/conversations/${conversation.id}/messages`,
        {
          content: `I would like to offer ₦${amount.toLocaleString()} x ${offerQuantity} for this item.`,
          offerAmount: amount,
          offerQuantity,
        },
      );
      appendMessage(data);
      setOfferAmount("");
      setOfferQuantity(1);
      setOfferOpen(false);
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
      const { data } = await axiosInstance.post(
        `/chat/conversations/${conversation.id}/messages`,
        { content },
      );
      appendMessage(data);
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
          onContentSizeChange={() => scrollToBottom()}
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
            const next = messages[index + 1];
            const itemFromMe = item.senderId === currentUserId;
            const groupedBefore =
              previous && previous.senderId === item.senderId;
            const groupedAfter = next && next.senderId === item.senderId;
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

            return (
              <View
                key={item.id}
                className={`mb-2 max-w-[84%] ${
                  itemFromMe ? "self-end items-end" : "self-start items-start"
                } ${groupedBefore ? "mt-0" : "mt-3"}`}
              >
                {!itemFromMe && !groupedBefore && (
                  <Text className="mb-1 ml-1 text-xs font-semibold text-gray-400">
                    {item.senderName || sellerName}
                  </Text>
                )}
                <View
                  className={`${bubbleRadius} px-4 py-3 ${
                    itemFromMe ? "bg-brand" : "bg-gray-100 dark:bg-white/10"
                  }`}
                >
                  <Text
                    variant="none"
                    className={`text-sm leading-5 ${
                      itemFromMe
                        ? "text-white"
                        : "text-gray-900 dark:text-white"
                    }`}
                  >
                    {item.content}
                  </Text>
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

          <View className="flex-row items-end justify-center rounded-3xl border border-gray-100 bg-gray-50 px-3 py-2 dark:border-white/10 dark:bg-white/5">
            <Pressable className="mb-1 h-10 w-10 items-center justify-center rounded-full bg-white dark:bg-white/10">
              <Ionicons
                name="add"
                size={22}
                color={isDark ? "white" : "#111827"}
              />
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
              disabled={!message.trim() || !conversation?.id || sending}
              className={`mb-1 h-10 w-10 items-center justify-center rounded-full ${
                message.trim() && conversation?.id && !sending
                  ? "bg-brand"
                  : "bg-gray-200 dark:bg-white/10"
              }`}
            >
              <Ionicons
                name="send"
                size={18}
                color={
                  message.trim() && conversation?.id && !sending
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
                const productId = params.productId || params.id;
                if (item.action && productId) item.action(productId);
              }}
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
