import { Ionicons } from "@expo/vector-icons";
import { Image, Pressable, View } from "react-native";

import { Text } from "@/components/themed/theme";

import type { ChatMessage } from "./chat-types";

type Props = {
  item: ChatMessage;
  imageBatch: ChatMessage[];
  previous?: ChatMessage;
  next?: ChatMessage;
  currentUserId?: number | null;
  getMediaUrl: (path?: string | null) => string | null;
  getMessageSenderName: (item: ChatMessage) => string;
  formatMessageTime: (createdAt: string) => string;
  getMessageStatus: (item: ChatMessage) => string;
  isSameUserId: (
    first?: number | string | null,
    second?: number | string | null,
  ) => boolean;
  openImageViewer: (urls: Array<string | null>, index?: number) => void;
};

export function ChatMessageItem({
  item,
  imageBatch,
  previous,
  next,
  currentUserId,
  getMediaUrl,
  getMessageSenderName,
  formatMessageTime,
  getMessageStatus,
  isSameUserId,
  openImageViewer,
}: Props) {
  const itemFromMe = isSameUserId(item.senderId, currentUserId);
  const groupedBefore = previous && isSameUserId(previous.senderId, item.senderId);
  const groupedAfter = next && isSameUserId(next.senderId, item.senderId);
  const hasImage = Boolean(item.imageUrl);
  const hasText = Boolean(item.content);
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

  const imageBatchUrls = imageBatch.map((batchItem) =>
    getMediaUrl(batchItem.imageUrl),
  );
  const isImageBatch = imageBatch.length > 1 && !hasText;

  return (
    <View
      className={`mb-2 ${isImageBatch ? "max-w-[92%]" : "max-w-[84%]"} ${
        itemFromMe ? "self-end items-end" : "self-start items-start"
      } ${groupedBefore ? "mt-0" : "mt-3"}`}
    >
      {!itemFromMe && !groupedBefore && (
        <Text className="mb-1 ml-1 text-xs font-semibold text-gray-400">
          {getMessageSenderName(item)}
        </Text>
      )}
      <View
        className={`${bubbleRadius} ${hasImage ? "p-1" : "px-4 py-3"} ${
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
                    onPress={() => openImageViewer(imageBatchUrls, batchIndex)}
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
                        <Text variant="none" className="text-lg font-semibold text-white">
                          +{hiddenCount}
                        </Text>
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <Pressable onPress={() => openImageViewer([getMediaUrl(item.imageUrl)])}>
              <Image
                source={{ uri: getMediaUrl(item.imageUrl) || undefined }}
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
            className={`text-sm leading-5 ${hasImage ? "px-3 pb-2 pt-1" : ""} ${
              itemFromMe ? "text-white" : "text-gray-900 dark:text-white"
            }`}
          >
            {item.content}
          </Text>
        ) : null}
        {item.offerAmount ? (
          <View className="mx-3 mt-2">
            <View
              className={`self-start rounded-full px-2.5 py-1 ${
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
                className={`text-[10px] font-semibold uppercase ${
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
              <Text className="mx-1 text-[11px] text-gray-400">•</Text>
              <Ionicons name="checkmark-done" size={13} color="#9CA3AF" />
              <Text className="ml-1 text-[11px] text-gray-400">
                {getMessageStatus(item)}
              </Text>
            </>
          )}
        </View>
      )}
    </View>
  );
}
