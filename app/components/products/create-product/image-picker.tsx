import { Text } from "@/components/themed/theme";
import { Ionicons } from "@expo/vector-icons";
import { Image, Pressable, ScrollView, View } from "react-native";

interface ImagePickerProps {
  images: string[];
  onAddImages: () => Promise<void>;
  onRemoveImage?: (index: number) => void;
  error?: string;
}

export function ImagePickerComponent({
  images,
  onAddImages,
  onRemoveImage,
  error,
}: ImagePickerProps) {
  return (
    <View className="mb-6">
      <View className="flex-row justify-between items-center mb-1.5 px-1">
        <Text className="text-sm font-semibold text-gray-700 dark:text-gray-400 capitalize tracking-tight">
          Product Images
        </Text>
        <Text className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
          {images.length}/7 images
        </Text>
      </View>

      <Pressable
        onPress={onAddImages}
        disabled={images.length >= 7}
        className={`border-2 border-dashed rounded-2xl h-24 items-center justify-center bg-gray-50/50 dark:bg-white/5 ${
          error ? "border-red-200" : "border-gray-200 dark:border-white/10"
        } ${images.length >= 7 ? "opacity-50" : ""}`}
      >
        <Ionicons
          name="camera-outline"
          size={32}
          color={error ? "#ef4444" : "#9CA3AF"}
        />
        <Text
          className={`mt-1 font-medium ${error ? "text-red-500" : "text-gray-500"} text-xs`}
        >
          {images.length >= 7 ? "Maximum limit reached" : "Upload item photos"}
        </Text>
      </Pressable>

      {images.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mt-4"
        >
          {images.map((uri, idx) => (
            <View key={idx} className="relative mr-4">
              <Image
                source={{ uri }}
                className="w-24 h-24 rounded-2xl border border-gray-100 dark:border-white/10"
              />
              <View className="absolute top-1 left-1 bg-black/50 rounded-full w-5 h-5 items-center justify-center">
                <Text className="text-white text-[10px] font-bold">
                  {idx + 1}
                </Text>
              </View>
              {/* Remove Button */}
              <Pressable
                onPress={() => onRemoveImage?.(idx)}
                className="absolute -top-2 -right-2 bg-white dark:bg-[#1A1A1A] rounded-full border border-gray-100 dark:border-white/10 p-1"
                hitSlop={10}
              >
                <Ionicons name="close" size={14} color="#ef4444" />
              </Pressable>
            </View>
          ))}
        </ScrollView>
      )}

      {error && (
        <View className="flex-row items-center mt-1.5 px-1">
          <Text className="text-red-500 text-xs font-medium">{error}</Text>
        </View>
      )}
    </View>
  );
}
