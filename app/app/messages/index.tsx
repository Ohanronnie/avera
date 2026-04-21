import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useColorScheme } from "nativewind";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Text } from "@/components/themed/theme";
import { useToast } from "@/contexts/ToastContext";
import { axiosInstance } from "@/utils/axios";

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
    createdAt: string;
  } | null;
  lastMessageAt?: string | null;
  updatedAt: string;
};

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
  const toast = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const loadConversations = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await axiosInstance.get("/chat/conversations");
      setConversations(data);
    } catch (error: any) {
      toast.show({
        title: "Messages unavailable",
        description:
          error?.response?.data?.message ||
          "We couldn't load your conversations.",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useFocusEffect(
    useCallback(() => {
      loadConversations();
    }, [loadConversations]),
  );

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
          <ActivityIndicator color="#2563EB" />
          <Text className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            Loading messages...
          </Text>
        </View>
      ) : conversations.length ? (
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="px-5 pb-10 pt-5">
            {conversations.map((conversation) => (
              <Pressable
                key={conversation.id}
                onPress={() =>
                  router.push({
                    pathname: "/messages/[id]",
                    params: {
                      id: String(conversation.id),
                      conversationId: String(conversation.id),
                      counterpartId: String(conversation.counterpart.id),
                      sellerId: String(conversation.sellerId),
                      sellerName: conversation.counterpart.name,
                      productName: conversation.product.name,
                      productPrice: formatPrice(conversation.product.price),
                      productId: String(conversation.productId),
                      productQuantity: String(
                        conversation.product.quantity || 1,
                      ),
                      ...(conversation.product.imageUrl
                        ? { productImage: conversation.product.imageUrl }
                        : {}),
                    },
                  })
                }
                className="mb-3 flex-row rounded-3xl border border-gray-100 bg-gray-50 p-3 dark:border-white/5 dark:bg-white/5"
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
                        conversation.lastMessage?.createdAt ||
                          conversation.lastMessageAt ||
                          conversation.updatedAt,
                      )}
                    </Text>
                  </View>
                  <Text
                    className="mt-1 text-xs font-semibold text-brand"
                    numberOfLines={1}
                  >
                    {conversation.product.name}
                  </Text>
                  <Text
                    className="mt-1 text-sm text-gray-500 dark:text-gray-400"
                    numberOfLines={1}
                  >
                    {conversation.lastMessage?.content ||
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
