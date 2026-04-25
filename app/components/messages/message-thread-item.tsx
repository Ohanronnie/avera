import { Ionicons } from "@expo/vector-icons";
import { VideoView, useVideoPlayer } from "expo-video";
import { Image, Pressable, View } from "react-native";

import { Text } from "@/components/themed/theme";

export type MessageThreadItemShape = {
  id: number;
  fromMe: boolean;
  text?: string;
  time: string;
  status: string;
  imageUrl?: string;
  offerAmount?: number;
  offerStatus?: "PENDING" | "ACCEPTED" | "REJECTED";
};

type Props = {
  item: MessageThreadItemShape;
  imageBatch: MessageThreadItemShape[];
  previous?: MessageThreadItemShape;
  next?: MessageThreadItemShape;
  sellerName: string;
  onOpenImageViewer?: (urls: string[], index?: number) => void;
  onOpenVideoViewer?: (url: string) => void;
};

const GRID_SIZE = 248;
const GRID_GAP = 4;
const GRID_TILE_SIZE = (GRID_SIZE - GRID_GAP) / 2;
const VIDEO_EXTENSIONS = /\.(mp4|mov|m4v|webm|3gp|mkv)(\?.*)?$/i;

const isVideoUrl = (url?: string) => Boolean(url && VIDEO_EXTENSIONS.test(url));

function MessageVideoTile({
  url,
  size,
  onOpenVideoViewer,
}: {
  url: string;
  size: number;
  onOpenVideoViewer?: (url: string) => void;
}) {
  const player = useVideoPlayer(url, (videoPlayer) => {
    videoPlayer.pause();
  });

  return (
    <View
      className="overflow-hidden rounded-[20px] bg-black"
      style={{ width: size, height: size }}
    >
      <VideoView
        player={player}
        nativeControls
        contentFit="cover"
        style={{ width: size, height: size }}
      />
      <Pressable
        onPress={() => onOpenVideoViewer?.(url)}
        className="absolute right-3 top-3 h-9 w-9 items-center justify-center rounded-full bg-black/60"
      >
        <Ionicons name="expand-outline" size={18} color="white" />
      </Pressable>
    </View>
  );
}

export function MessageThreadItem({
  item,
  imageBatch,
  previous,
  next,
  sellerName,
  onOpenImageViewer,
  onOpenVideoViewer,
}: Props) {
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
  const bubbleTone =
    item.offerAmount && item.offerStatus === "ACCEPTED"
      ? item.fromMe
        ? "bg-emerald-600"
        : "bg-emerald-100 dark:bg-emerald-500/20"
      : item.offerAmount && item.offerStatus === "REJECTED"
        ? item.fromMe
          ? "bg-red-600"
          : "bg-red-100 dark:bg-red-500/20"
        : item.fromMe
          ? "bg-brand"
          : "bg-gray-100 dark:bg-white/10";
  const bubbleTextTone =
    item.offerAmount &&
    (item.offerStatus === "ACCEPTED" || item.offerStatus === "REJECTED")
      ? item.fromMe
        ? "text-white"
        : item.offerStatus === "ACCEPTED"
          ? "text-emerald-900 dark:text-emerald-100"
          : "text-red-900 dark:text-red-100"
      : item.fromMe
        ? "text-white"
        : "text-gray-900 dark:text-white";
  const mediaUrls = imageBatch.map((mediaItem) => mediaItem.imageUrl).filter(Boolean) as string[];
  const visibleImageUrls = mediaUrls.slice(0, 4);
  const hasMedia = mediaUrls.length > 0;
  const hasText = Boolean(item.text?.trim());
  const isVideoMessage = mediaUrls.length === 1 && isVideoUrl(mediaUrls[0]);
  const hiddenImageCount = Math.max(mediaUrls.length - 4, 0);

  const renderImageGrid = () => {
    if (visibleImageUrls.length === 1) {
      return (
        <Pressable
          onPress={() => onOpenImageViewer?.(mediaUrls, 0)}
          className="overflow-hidden rounded-[20px]"
          style={{ width: GRID_SIZE, height: GRID_SIZE }}
        >
          <Image
            source={{ uri: visibleImageUrls[0] }}
            resizeMode="cover"
            style={{ width: GRID_SIZE, height: GRID_SIZE }}
            className="bg-gray-200 dark:bg-white/10"
          />
        </Pressable>
      );
    }

    if (visibleImageUrls.length === 2) {
      return (
        <View
          className="overflow-hidden rounded-[20px]"
          style={{ width: GRID_SIZE, height: GRID_SIZE }}
        >
          {visibleImageUrls.map((url, index) => (
            <Pressable
              key={`${item.id}-${index}`}
              onPress={() => onOpenImageViewer?.(mediaUrls, index)}
              className="overflow-hidden"
              style={{
                width: GRID_SIZE,
                height: GRID_TILE_SIZE,
                marginBottom: index === 0 ? GRID_GAP : 0,
              }}
            >
              <Image
                source={{ uri: url }}
                resizeMode="cover"
                style={{ width: GRID_SIZE, height: GRID_TILE_SIZE }}
                className="bg-gray-200 dark:bg-white/10"
              />
            </Pressable>
          ))}
        </View>
      );
    }

    if (visibleImageUrls.length === 3) {
      return (
        <View
          className="overflow-hidden rounded-[20px]"
          style={{ width: GRID_SIZE, height: GRID_SIZE }}
        >
          <View className="flex-row" style={{ marginBottom: GRID_GAP }}>
            {visibleImageUrls.slice(0, 2).map((url, index) => (
              <Pressable
                key={`${item.id}-${index}`}
                onPress={() => onOpenImageViewer?.(mediaUrls, index)}
                className="overflow-hidden"
                style={{
                  width: GRID_TILE_SIZE,
                  height: GRID_TILE_SIZE,
                  marginRight: index === 0 ? GRID_GAP : 0,
                }}
              >
                <Image
                  source={{ uri: url }}
                  resizeMode="cover"
                  style={{ width: GRID_TILE_SIZE, height: GRID_TILE_SIZE }}
                  className="bg-gray-200 dark:bg-white/10"
                />
              </Pressable>
            ))}
          </View>
          <Pressable
            onPress={() => onOpenImageViewer?.(mediaUrls, 2)}
            className="overflow-hidden"
            style={{ width: GRID_SIZE, height: GRID_TILE_SIZE }}
          >
            <Image
              source={{ uri: visibleImageUrls[2] }}
              resizeMode="cover"
              style={{ width: GRID_SIZE, height: GRID_TILE_SIZE }}
              className="bg-gray-200 dark:bg-white/10"
            />
          </Pressable>
        </View>
      );
    }

    const gridRows = [
      visibleImageUrls.slice(0, 2),
      visibleImageUrls.slice(2, 4),
    ];

    return (
      <View
        className="overflow-hidden rounded-[20px]"
        style={{ width: GRID_SIZE, height: GRID_SIZE }}
      >
        {gridRows.map((row, rowIndex) => (
          <View
            key={`${item.id}-row-${rowIndex}`}
            className="flex-row"
            style={{ marginBottom: rowIndex === 0 ? GRID_GAP : 0 }}
          >
            {row.map((url, columnIndex) => {
              const index = rowIndex * 2 + columnIndex;

              return (
                <Pressable
                  key={`${item.id}-${index}`}
                  onPress={() => onOpenImageViewer?.(mediaUrls, index)}
                  className="relative overflow-hidden"
                  style={{
                    width: GRID_TILE_SIZE,
                    height: GRID_TILE_SIZE,
                    marginRight: columnIndex === 0 ? GRID_GAP : 0,
                  }}
                >
                  <Image
                    source={{ uri: url }}
                    resizeMode="cover"
                    style={{ width: GRID_TILE_SIZE, height: GRID_TILE_SIZE }}
                    className="bg-gray-200 dark:bg-white/10"
                  />
                  {index === 3 && hiddenImageCount > 0 ? (
                    <View className="absolute inset-0 items-center justify-center bg-black/45">
                      <Text variant="none" className="text-2xl font-bold text-white">
                        +{hiddenImageCount}
                      </Text>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
            {row.length === 1 ? (
              <View style={{ width: GRID_TILE_SIZE, height: GRID_TILE_SIZE }} />
            ) : null}
          </View>
        ))}
      </View>
    );
  };

  return (
    <View
      className={`mb-2 ${hasMedia ? "max-w-[88%]" : "max-w-[84%]"} ${
        item.fromMe ? "self-end items-end" : "self-start items-start"
      } ${groupedBefore ? "mt-0" : "mt-3"}`}
    >
      {!item.fromMe && !groupedBefore && (
        <Text className="mb-1 ml-1 text-xs font-semibold text-gray-400">
          {sellerName}
        </Text>
      )}
      <View className={`${bubbleRadius} ${hasMedia ? "p-1.5" : "px-4 py-3"} ${bubbleTone}`}>
        {hasMedia ? (
          isVideoMessage ? (
            <MessageVideoTile
              url={mediaUrls[0]}
              size={GRID_SIZE}
              onOpenVideoViewer={onOpenVideoViewer}
            />
          ) : (
            renderImageGrid()
          )
        ) : null}
        {hasText ? (
          <Text
            variant="none"
            className={`text-sm leading-5 ${hasMedia ? "px-3 pb-2 pt-3" : ""} ${bubbleTextTone}`}
          >
            {item.text}
          </Text>
        ) : null}
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
}
