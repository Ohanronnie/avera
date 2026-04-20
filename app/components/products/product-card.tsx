import React, { useState } from "react";
import { Image, View, Pressable } from "react-native";
import { Text } from "../themed/theme";
import {
  Heart,
  Star,
  ShoppingCart,
  Bookmark,
  BookmarkCheck,
} from "lucide-react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { router } from "expo-router";

export interface IProduct {
  title: string;
  price: number;
  originalPrice: number;
  rating: number;
  reviews: number;
  onPress?: () => void;
  onFavorite?: () => void;
  discount: string;
  condition: string;
  location: string;
  id: number;
  imageUrl?: string;
}
export function ProductCard({ product }: { product: IProduct }) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const {
    onFavorite,
    price,
    title,
    originalPrice,
    discount,
    condition,
    location,
    id,
    imageUrl,
  } = product;
  const [isFavorited, setIsFavorited] = useState(false);

  const handleFavorite = () => {
    setIsFavorited(!isFavorited);
    onFavorite?.();
  };

  return (
    <Pressable
      onPress={() => router.push(`/product/${id}`)}
      className="w-[48%] mb-6 bg-white dark:bg-[#1A1A1A] rounded-3xl overflow-hidden border border-gray-200 dark:border-white/5"
      android_ripple={{ color: "#f5f5f5" }}
    >
      {/* Image Section */}
      <View className="relative h-48 bg-gray-100 dark:bg-white/5">
        {/* Discount Badge */}
        {discount && (
          <View className="absolute top-3 left-3 bg-red-500 px-2 py-1 rounded-full z-10">
            <Text className="text-white text-xs font-bold">{discount}</Text>
          </View>
        )}

        {/* Favorite Button */}
        <Pressable
          onPress={handleFavorite}
          className="absolute top-3 right-3 w-9 h-9 bg-white/95 dark:bg-black/20 rounded-full items-center justify-center z-10 border border-gray-200 dark:border-white/5"
          android_ripple={{ color: "#f0f0f0", radius: 18 }}
        >
          <Ionicons
            name={isFavorited ? "heart" : "heart-outline"}
            size={18}
            color={isFavorited ? "#EF4444" : isDark ? "#FFF" : "#9CA3AF"}
            fill={isFavorited ? "#EF4444" : "none"}
          />
        </Pressable>

        {/* Product Image */}
        <Image
          source={
            imageUrl ? { uri: imageUrl } : require("@/assets/images/shoe.jpg")
          }
          className="w-full h-full"
          resizeMode="cover"
        />
      </View>

      {/* Content Section */}
      <View className="p-3 space-y-2">
        {/* Title */}
        <Text
          className="text-sm font-semibold text-gray-900 dark:text-gray-200"
          numberOfLines={1}
        >
          {title}
        </Text>

        {/* Price */}
        <View className="flex-row items-baseline">
          <Text className="text-lg font-bold text-gray-900 dark:text-white mr-2">
            ₦{Number(price).toLocaleString()}
          </Text>
          {originalPrice > 0 && (
            <Text className="text-xs text-gray-400 line-through">
              ₦{Number(originalPrice).toLocaleString()}
            </Text>
          )}
        </View>

        {/* Meta Info */}
        <View className="flex-row mb-2 items-center">
          <Ionicons name="location" size={12} color="#9CA3AF" />
          <Text className="ml-1 text-xs text-gray-500 dark:text-gray-400">
            {location}
          </Text>
        </View>

        {/* Condition Badge */}
        {condition && (
          <View className="bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded-md self-start mt-1 border border-gray-200 dark:border-white/5">
            <Text className="text-gray-600 dark:text-gray-400 text-[10px] font-bold uppercase tracking-tight">
              {condition}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}
