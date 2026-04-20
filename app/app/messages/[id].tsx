import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useColorScheme } from "nativewind";
import { useState } from "react";
import {
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

const quickReplies = [
  "Is this still available?",
  "Can you share more photos?",
  "What is your last price?",
  "Can we use escrow?",
];

const starterMessages = [
  {
    id: 1,
    fromMe: false,
    text: "Hi, thanks for checking this out. The item is still available.",
    time: "09:41",
    status: "Seen",
  },
  {
    id: 2,
    fromMe: true,
    text: "Nice. Can you confirm the condition and pickup location?",
    time: "09:42",
    status: "Delivered",
  },
  {
    id: 3,
    fromMe: false,
    text: "It is exactly as listed. Pickup is available in Lagos, or we can arrange delivery.",
    time: "09:43",
    status: "Seen",
  },
  {
    id: 4,
    fromMe: false,
    text: "It is exactly as listed. Pickup is available in Lagos, or we can arrange delivery.",
    time: "09:43",
    status: "Seen",
  },
];

const actionItems = [
  {
    icon: "cube-outline",
    title: "View product",
    description: "Open the listing attached to this chat.",
    tone: "default",
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
  const [message, setMessage] = useState("");
  const [actionsOpen, setActionsOpen] = useState(false);
  const [offerOpen, setOfferOpen] = useState(false);
  const [offerAmount, setOfferAmount] = useState("");
  const [messages, setMessages] = useState(starterMessages);
  const params = useLocalSearchParams<{
    id?: string;
    sellerName?: string;
    productName?: string;
    productPrice?: string;
    productImage?: string;
  }>();

  const sellerName = params.sellerName || "Avera Seller";
  const productName = params.productName || "Product listing";
  const productPrice = params.productPrice || "Price available";
  const sellerInitial = sellerName.slice(0, 1).toUpperCase();
  const productNumericPrice =
    Number(String(productPrice).replace(/[^0-9.]/g, "")) || 0;

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

  const sendMessage = () => {
    const trimmed = message.trim();
    if (!trimmed) return;

    setMessages((current) => [
      ...current,
      {
        id: Date.now(),
        fromMe: true,
        text: trimmed,
        time: "Now",
        status: "Sending",
      },
    ]);
    setMessage("");
  };

  const submitOffer = () => {
    const amount = Number(offerAmount.replace(/[^0-9.]/g, ""));
    if (!amount) return;

    setMessages((current) => [
      ...current,
      {
        id: Date.now(),
        fromMe: true,
        text: `I would like to offer ₦${amount.toLocaleString()} for this item.`,
        time: "Now",
        status: "Sending",
      },
    ]);
    setOfferAmount("");
    setOfferOpen(false);
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
                <Text variant="none" className="text-base font-black text-brand">
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
          className="flex-1"
          contentContainerClassName="px-4 pb-6 pt-4"
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
                {productName} (6)
              </Text>yu
              <View className="mt-1 flex-row items-center">
                <Text className="text-sm font-black text-brand">
                  {productPrice}
                </Text>
                <View className="ml-2 flex-row items-center rounded-full bg-brand/10 px-2 py-0.5">
                  <Ionicons name="shield-checkmark-outline" size={12} color="#2563EB" />
                  <Text variant="none" className="ml-1 text-[10px] font-bold text-brand">
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
            <Ionicons name="information-circle-outline" size={15} color="#9CA3AF" />
            <Text className="ml-1.5 text-center text-xs leading-5 text-gray-500 dark:text-gray-400">
              Use Buy Now and escrow. Avoid sending money outside Avera.
            </Text>
          </View>

          <View className="mb-5 items-center">
            <Text className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-500 dark:bg-white/5 dark:text-gray-400">
              Today
            </Text>
          </View>

          {messages.map((item, index) => {
            const previous = messages[index - 1];
            const next = messages[index + 1];
            const groupedBefore = previous?.fromMe === item.fromMe;
            const groupedAfter = next?.fromMe === item.fromMe;
            const groupPosition =
              !groupedBefore && !groupedAfter
                ? "single"
                : !groupedBefore
                  ? "first"
                  : groupedAfter
                    ? "middle"
                    : "last";
            const bubbleRadius = item.fromMe
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
                  item.fromMe ? "self-end items-end" : "self-start items-start"
                } ${groupedBefore ? "mt-0" : "mt-3"}`}
              >
                {!item.fromMe && !groupedBefore && (
                  <Text className="mb-1 ml-1 text-xs font-semibold text-gray-400">
                    {sellerName}
                  </Text>
                )}
                <View
                  className={`${bubbleRadius} px-4 py-3 ${
                    item.fromMe
                      ? "bg-brand"
                      : "bg-gray-100 dark:bg-white/10"
                  }`}
                >
                  <Text
                    variant="none"
                    className={`text-sm leading-5 ${
                      item.fromMe ? "text-white" : "text-gray-900 dark:text-white"
                    }`}
                  >
                    {item.text}
                  </Text>
                </View>
                {!groupedAfter && (
                  <View
                    className={`mt-1 flex-row items-center ${
                      item.fromMe ? "justify-end" : "justify-start"
                    }`}
                  >
                    <Text className="text-[11px] text-gray-400">{item.time}</Text>
                    {item.fromMe && (
                      <>
                        <Text className="mx-1 text-[11px] text-gray-400">•</Text>
                        <Ionicons name="checkmark-done" size={13} color="#9CA3AF" />
                        <Text className="ml-1 text-[11px] text-gray-400">
                          {item.status}
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
              onPress={() => openSellerProfile()}
              className="flex-1 items-center justify-center rounded-2xl bg-brand/10 py-3"
            >
              <Text variant="none" className="text-xs font-bold text-brand">
                Seller profile
              </Text>
            </Pressable>
          </View>

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
              className={`mb-1 h-10 w-10 items-center justify-center rounded-full ${
                message.trim() ? "bg-brand" : "bg-gray-200 dark:bg-white/10"
              }`}
            >
              <Ionicons
                name="send"
                size={18}
                color={
                  message.trim() ? "white" : isDark ? "#9CA3AF" : "#6B7280"
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
              onPress={() => setActionsOpen(false)}
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
          <View className="rounded-3xl border border-gray-100 bg-gray-50 p-4 dark:border-white/5 dark:bg-white/5">
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
            <View className="mt-3 flex-row items-center rounded-3xl border border-gray-100 bg-gray-50 px-4 dark:border-white/10 dark:bg-white/5">
              <Text className="text-xl font-black text-brand">₦</Text>
              <TextInput
                value={offerAmount}
                onChangeText={setOfferAmount}
                keyboardType="numeric"
                placeholder="Enter amount"
                placeholderTextColor="#888"
                className="h-16 flex-1 px-3 text-xl font-bold text-gray-950 dark:text-white"
              />
            </View>
          </View>

          {productNumericPrice > 0 && (
            <View className="mt-4 flex-row flex-wrap">
              {[0.9, 0.85, 0.8].map((multiplier) => {
                const amount = Math.round(productNumericPrice * multiplier);

                return (
                  <Pressable
                    key={multiplier}
                    onPress={() => setOfferAmount(String(amount))}
                    className="mb-2 mr-2 rounded-full bg-brand/10 px-4 py-2"
                  >
                    <Text variant="none" className="text-xs font-bold text-brand">
                      ₦{amount.toLocaleString()}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          <View className="mt-5 rounded-3xl border border-amber-500/20 bg-amber-500/10 p-4">
            <View className="flex-row items-start">
              <Ionicons name="information-circle-outline" size={20} color="#F59E0B" />
              <Text className="ml-2 flex-1 text-sm leading-5 text-gray-600 dark:text-gray-300">
                The seller can accept, reject, or counter your offer. Payment still goes through escrow later.
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
                offerAmount.trim() ? "bg-brand" : "bg-gray-300 dark:bg-white/10"
              }`}
            >
              <Text variant="none" className="font-bold text-white">
                Send offer
              </Text>
            </Pressable>
          </View>
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}
