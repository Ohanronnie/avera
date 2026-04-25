import { Ionicons } from "@expo/vector-icons";
import { Image, Pressable, ScrollView, View } from "react-native";

import { AveraLoader } from "@/components/brand/AveraLoader";
import { Text } from "@/components/themed/theme";

type Props = {
  loadingConversation: boolean;
  messagesCount: number;
  productImage?: string | null;
  productName: string;
  productPrice: string;
  quickReplies: string[];
  onOpenProduct: () => void;
  onUseQuickReply: (reply: string) => void;
};

export function ConversationIntro({
  loadingConversation,
  messagesCount,
  productImage,
  productName,
  productPrice,
  quickReplies,
  onOpenProduct,
  onUseQuickReply,
}: Props) {
  return (
    <>
      <Pressable
        onPress={onOpenProduct}
        className="mb-3 flex-row rounded-[28px] border border-gray-100 bg-gray-50 p-3 dark:border-white/5 dark:bg-white/5"
      >
        {productImage ? (
          <Image
            source={{ uri: productImage }}
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
            <Text className="text-sm font-semibold text-brand">{productPrice}</Text>
            <View className="ml-2 flex-row items-center rounded-full bg-brand/10 px-2 py-0.5">
              <Ionicons
                name="shield-checkmark-outline"
                size={12}
                color="#2563EB"
              />
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
          Buy through Avera. Payment is protected by escrow.
        </Text>
      </View>

      {loadingConversation ? (
        <View className="items-center justify-center py-16">
          <AveraLoader label="Opening chat" />
        </View>
      ) : messagesCount === 0 ? (
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
                onPress={() => onUseQuickReply(reply)}
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
    </>
  );
}
