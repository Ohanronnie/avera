import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useColorScheme } from "nativewind";
import { useCallback, useEffect, useState } from "react";
import { Image, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Socket } from "socket.io-client";

import { AveraLoader } from "@/components/brand/AveraLoader";
import { Text } from "@/components/themed/theme";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useAppStore } from "@/stores/app-store";
import { connectSocket } from "@/utils/socket";

type Conversation = {
  id: number;
  buyerId: number;
  sellerId: number;
  productId: number;
  product: {
    id: number;
    name: string;
    price: number;
    quantity?: number;
    imageUrl?: string | null;
  };
  counterpart: {
    id: number;
    name: string;
    avatarUrl?: string | null;
  };
  lastMessage?: {
    content: string;
    imageUrl?: string | null;
    createdAt: string;
  } | null;
  unreadCount?: number;
  updatedAt: string;
};

type RawConversationPayload = {
  id: number;
  buyerId: number;
  sellerId: number;
  productId: number;
  updatedAt: string;
  unreadCount?: number;
  product?: {
    id: number;
    name: string;
    price: number | string;
    quantity?: number;
    sellerId?: number;
    images?: Array<{ url?: string | null }>;
  };
  buyer?: {
    id: number;
    firstName?: string | null;
    lastName?: string | null;
    avatarUrl?: string | null;
  };
  seller?: {
    id: number;
    firstName?: string | null;
    lastName?: string | null;
    avatarUrl?: string | null;
  };
  messages?: Array<{
    id: number;
    senderId: number;
    content?: string | null;
    imageUrl?: string | null;
    createdAt: string;
    readAt?: string | null;
  }>;
};

type IncomingConversationMessage = {
  conversationId: number;
  senderId: number;
  content?: string | null;
  imageUrl?: string | null;
  createdAt: string | Date;
};

const emitWithAck = <TResponse,>(socket: Socket, event: string) =>
  new Promise<TResponse>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Socket request timed out"));
    }, 8000);

    socket.emit(event, (response: TResponse) => {
      clearTimeout(timeout);
      resolve(response);
    });
  });

const getDisplayName = (person?: {
  firstName?: string | null;
  lastName?: string | null;
}) => {
  const fullName = [person?.firstName, person?.lastName]
    .filter(Boolean)
    .join(" ");
  return fullName || "Avera user";
};

const normalizeConversation = (
  payload: RawConversationPayload,
  currentUserId?: number | null,
): Conversation => {
  const isBuyer = payload.buyerId === currentUserId;
  const counterpart = isBuyer ? payload.seller : payload.buyer;
  const lastMessage = payload.messages?.[0];

  return {
    id: payload.id,
    buyerId: payload.buyerId,
    sellerId: payload.sellerId,
    productId: payload.productId,
    product: {
      id: payload.product?.id || payload.productId,
      name: payload.product?.name || "Product listing",
      price: Number(payload.product?.price || 0),
      quantity: payload.product?.quantity,
      imageUrl: payload.product?.images?.[0]?.url || null,
    },
    counterpart: {
      id: counterpart?.id || 0,
      name: getDisplayName(counterpart),
      avatarUrl: counterpart?.avatarUrl || null,
    },
    lastMessage: lastMessage
      ? {
          content: lastMessage.content || "",
          imageUrl: lastMessage.imageUrl || null,
          createdAt: lastMessage.createdAt,
        }
      : null,
    unreadCount:
      payload.unreadCount ||
      payload.messages?.filter(
        (message) => message.senderId !== currentUserId && !message.readAt,
      ).length ||
      0,
    updatedAt: payload.updatedAt,
  };
};

const getConversationLastMessageTime = (conversation: Conversation) =>
  conversation.lastMessage?.createdAt || null;

const sortConversationsByLastMessage = (items: Conversation[]) =>
  [...items].sort((first, second) => {
    const firstTime = getConversationLastMessageTime(first);
    const secondTime = getConversationLastMessageTime(second);

    if (!firstTime && !secondTime) return 0;
    if (!firstTime) return 1;
    if (!secondTime) return -1;

    return new Date(secondTime).getTime() - new Date(firstTime).getTime();
  });

const formatPrice = (value: number) =>
  `₦${Number(value || 0).toLocaleString()}`;

const formatTimeAgo = (value?: string | null) => {
  if (!value) return "New";

  const date = new Date(value);
  const now = Date.now();
  const diffInMinutes = Math.max(
    0,
    Math.floor((now - date.getTime()) / (1000 * 60)),
  );
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInMinutes < 1) return "Just now";
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  if (diffInHours < 24) return `${diffInHours}h`;
  if (diffInDays < 7) return `${diffInDays}d`;
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
};

export default function MessagesInboxScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { user } = useAuth();
  const toast = useToast();
  const markMessagesSynced = useAppStore((state) => state.markMessagesSynced);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const loadConversations = useCallback(async () => {
    try {
      setLoading(true);
      const socket = connectSocket();
      const payload = await emitWithAck<RawConversationPayload[]>(
        socket,
        "conversations:getAll",
      );
      setConversations(
        sortConversationsByLastMessage(
          (payload || []).map((conversation) =>
            normalizeConversation(conversation, Number(user!.id)),
          ),
        ),
      );
      markMessagesSynced();
    } catch (error: any) {
      toast.show({
        title: "Messages unavailable",
        description:
          error?.response?.data?.message ||
          error?.message ||
          "We couldn't load your conversations.",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [markMessagesSynced, toast, user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadConversations();
    }, [loadConversations]),
  );

  useEffect(() => {
    const socket = connectSocket();

    const handleInboxEmit = (payload: IncomingConversationMessage) => {
      if (!payload?.conversationId) return;

      setConversations((current) => {
        const next = current.map((conversation) => {
          if (conversation.id !== payload.conversationId) return conversation;

          const isIncoming = payload.senderId !== user?.id;

          return {
            ...conversation,
            lastMessage: {
              content: payload.content || "",
              imageUrl: payload.imageUrl || null,
              createdAt: new Date(payload.createdAt).toISOString(),
            },
            unreadCount: isIncoming
              ? (conversation.unreadCount || 0) + 1
              : conversation.unreadCount || 0,
          };
        });

        return sortConversationsByLastMessage(next);
      });
    };

    socket.on("inbox:emit", handleInboxEmit);

    return () => {
      socket.off("inbox:emit", handleInboxEmit);
    };
  }, [user?.id]);

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#0A0A0A]" edges={["top"]}>
      <View className="border-b border-gray-100 bg-white px-5 py-4 dark:border-white/5 dark:bg-[#0A0A0A]">
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
          <View className="ml-3 flex-1">
            <Text className="text-2xl font-bold text-gray-950 dark:text-white">
              Messages
            </Text>
            <Text className="mt-0.5 text-xs font-medium text-gray-500 dark:text-gray-400">
              Buyers, sellers, offers, and order questions.
            </Text>
          </View>
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <AveraLoader label="Loading messages" />
        </View>
      ) : conversations.length ? (
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="px-5 pb-10 pt-5">
            {conversations.map((conversation) => (
              <Pressable
                key={conversation.id}
                onPress={() => {
                  setConversations((current) =>
                    current.map((item) =>
                      item.id === conversation.id
                        ? { ...item, unreadCount: 0 }
                        : item,
                    ),
                  );
                  router.push({
                    pathname: "/messages/[id]",
                    params: {
                      id: String(conversation.id),
                    },
                  });
                }}
                className="mb-3 flex-row rounded-2xl border border-gray-100 bg-gray-50 p-3 dark:border-white/5 dark:bg-white/5"
              >
                {conversation.product.imageUrl ? (
                  <Image
                    source={{ uri: conversation.product.imageUrl }}
                    className="h-16 w-16 rounded-2xl bg-gray-200 dark:bg-white/10"
                  />
                ) : (
                  <View className="h-16 w-16 items-center justify-center rounded-2xl bg-brand/10">
                    <Ionicons name="cube-outline" size={22} color="#2563EB" />
                  </View>
                )}

                <View className="ml-3 flex-1 justify-center">
                  <View className="flex-row items-center justify-between">
                    <Text
                      className="flex-1 pr-3 text-base font-bold text-gray-950 dark:text-white"
                      numberOfLines={1}
                    >
                      {conversation.counterpart.name}
                    </Text>
                    <Text className="text-xs font-semibold text-gray-400">
                      {formatTimeAgo(
                        getConversationLastMessageTime(conversation),
                      )}
                    </Text>
                  </View>
                  <View className="mt-1 flex-row items-center">
                    <Text
                      className="flex-1 text-xs font-semibold text-brand"
                      numberOfLines={1}
                    >
                      {conversation.product.name} •{" "}
                      {formatPrice(conversation.product.price)}
                    </Text>
                    {conversation.unreadCount ? (
                      <View className="ml-2 min-w-5 items-center justify-center rounded-full bg-brand px-1.5 py-0.5">
                        <Text
                          variant="none"
                          className="text-[10px] font-semibold text-white"
                        >
                          {conversation.unreadCount > 9
                            ? "9+"
                            : conversation.unreadCount}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <Text
                    className={`mt-1 text-sm ${
                      conversation.unreadCount
                        ? "font-bold text-gray-900 dark:text-white"
                        : "text-gray-500 dark:text-gray-400"
                    }`}
                    numberOfLines={1}
                  >
                    {conversation.lastMessage?.content ||
                      (conversation.lastMessage?.imageUrl ? "Photo" : null) ||
                      "No messages yet. Start the conversation."}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      ) : (
        <View className="flex-1 items-center justify-center px-8">
          <View className="mb-5 h-24 w-24 items-center justify-center rounded-full bg-brand/10">
            <Ionicons name="chatbubbles-outline" size={36} color="#2563EB" />
          </View>
          <Text className="text-center text-xl font-bold text-gray-950 dark:text-white">
            No messages yet
          </Text>
          <Text className="mt-2 text-center text-sm leading-5 text-gray-500 dark:text-gray-400">
            Conversations with buyers and sellers will show up here.
          </Text>
          <Pressable
            onPress={() => router.push("/(tabs)/home")}
            className="mt-8 rounded-2xl bg-brand px-6 py-4"
          >
            <Text variant="none" className="font-bold text-white">
              Browse products
            </Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}
