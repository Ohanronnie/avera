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

const quickReplies = [
  "Is this still available?",
  "Can you share more photos?",
  "What is your last price?",
];

const sampleMessages = [
  {
    id: 1,
    fromMe: false,
    text: "Hi, thanks for checking this out. The item is still available.",
    time: "09:41",
  },
  {
    id: 2,
    fromMe: true,
    text: "Nice. Can you confirm the condition and pickup location?",
    time: "09:42",
  },
  {
    id: 3,
    fromMe: false,
    text: "It is exactly as listed. Pickup is available in Lagos, or we can arrange delivery.",
    time: "09:43",
  },
];

export default function MessageDetailsScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const [message, setMessage] = useState("");
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

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#0A0A0A]" edges={["top"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <View className="flex-row items-center border-b border-gray-100 bg-white px-4 py-3 dark:border-white/5 dark:bg-[#0A0A0A]">
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

          <View className="ml-3 h-11 w-11 items-center justify-center rounded-2xl bg-brand/10">
            <Text variant="none" className="text-base font-black text-brand">
              {sellerInitial}
            </Text>
          </View>

          <View className="ml-3 flex-1">
            <Text className="text-base font-bold text-gray-950 dark:text-white">
              {sellerName}
            </Text>
            <View className="mt-0.5 flex-row items-center">
              <View className="mr-1.5 h-2 w-2 rounded-full bg-emerald-500" />
              <Text className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Usually replies fast
              </Text>
            </View>
          </View>

          <Pressable className="h-11 w-11 items-center justify-center rounded-full bg-gray-50 dark:bg-white/5">
            <Ionicons
              name="ellipsis-horizontal"
              size={20}
              color={isDark ? "white" : "#111827"}
            />
          </Pressable>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerClassName="px-4 pb-5 pt-4"
          showsVerticalScrollIndicator={false}
        >
          <View className="mb-5 flex-row rounded-3xl border border-gray-100 bg-gray-50 p-3 dark:border-white/5 dark:bg-white/5">
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
              <Text className="mt-1 text-sm font-black text-brand">
                {productPrice}
              </Text>
              <Text className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Product conversation preview
              </Text>
            </View>
          </View>

          <View className="mb-5 items-center">
            <Text className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-500 dark:bg-white/5 dark:text-gray-400">
              Today
            </Text>
          </View>

          {sampleMessages.map((item) => (
            <View
              key={item.id}
              className={`mb-4 max-w-[82%] ${
                item.fromMe ? "self-end" : "self-start"
              }`}
            >
              <View
                className={`rounded-3xl px-4 py-3 ${
                  item.fromMe
                    ? "rounded-br-md bg-brand"
                    : "rounded-bl-md bg-gray-100 dark:bg-white/10"
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
              <Text
                className={`mt-1 text-[11px] text-gray-400 ${
                  item.fromMe ? "text-right" : "text-left"
                }`}
              >
                {item.time}
              </Text>
            </View>
          ))}

          <View className="mt-2">
            <Text className="mb-2 text-xs font-bold uppercase tracking-widest text-gray-400">
              Quick replies
            </Text>
            <View className="flex-row flex-wrap">
              {quickReplies.map((reply) => (
                <Pressable
                  key={reply}
                  onPress={() => setMessage(reply)}
                  className="mb-2 mr-2 rounded-full border border-gray-100 bg-gray-50 px-4 py-2 dark:border-white/10 dark:bg-white/5"
                >
                  <Text className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    {reply}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </ScrollView>

        <View className="border-t border-gray-100 bg-white px-4 pb-4 pt-3 dark:border-white/5 dark:bg-[#0A0A0A]">
          <View className="flex-row items-end rounded-3xl border border-gray-100 bg-gray-50 px-3 py-2 dark:border-white/10 dark:bg-white/5">
            <Pressable className="mb-1 h-10 w-10 items-center justify-center rounded-full bg-white dark:bg-white/10">
              <Ionicons name="add" size={22} color={isDark ? "white" : "#111827"} />
            </Pressable>
            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder="Message seller..."
              placeholderTextColor="#888"
              multiline
              className="max-h-28 flex-1 px-3 py-2 text-base text-gray-950 dark:text-white"
            />
            <Pressable
              className={`mb-1 h-10 w-10 items-center justify-center rounded-full ${
                message.trim() ? "bg-brand" : "bg-gray-200 dark:bg-white/10"
              }`}
            >
              <Ionicons
                name="send"
                size={18}
                color={message.trim() ? "white" : isDark ? "#9CA3AF" : "#6B7280"}
              />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
