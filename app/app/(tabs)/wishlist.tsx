import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/themed/theme";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useColorScheme } from "nativewind";
import { router } from "expo-router";
import { ProductCard } from "@/components/products/product-card";
import { mapProductToCard } from "@/features/products/types";
import { useWishlistProducts } from "@/features/wishlist/hooks";

export default function WishlistScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const {
    data: wishlistProducts = [],
    isLoading,
    isError,
    refetch,
  } = useWishlistProducts();
  const products = wishlistProducts.map(mapProductToCard);

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#0A0A0A]" edges={["top"]}>
      <View className="border-b border-gray-100 bg-white px-5 py-4 dark:border-white/5 dark:bg-[#0A0A0A]">
        <Text className="text-2xl font-bold text-gray-900 dark:text-white">
          Wishlist
        </Text>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View className="items-center justify-center px-10 py-32">
            <ActivityIndicator color="#2563EB" size="small" />
            <Text className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              Loading saved items...
            </Text>
          </View>
        ) : isError ? (
          <View className="items-center justify-center px-10 py-32">
            <View className="mb-6 h-24 w-24 items-center justify-center rounded-full bg-red-50 dark:bg-red-500/10">
              <Ionicons name="warning-outline" size={40} color="#EF4444" />
            </View>
            <Text className="text-center text-xl font-bold text-gray-900 dark:text-white">
              Could not load wishlist
            </Text>
            <Text className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">
              Please sign in or try again in a moment.
            </Text>
            <TouchableOpacity
              onPress={() => refetch()}
              className="mt-8 rounded-2xl bg-brand px-8 py-4"
              activeOpacity={0.8}
            >
              <Text className="font-bold text-white">Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : products.length ? (
          <View className="px-5 pb-28 pt-5">
            <Text className="mb-4 text-sm text-gray-500 dark:text-gray-400">
              {products.length} saved {products.length === 1 ? "item" : "items"}
            </Text>
            <View className="flex-row flex-wrap justify-between">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </View>
          </View>
        ) : (
          <View className="items-center justify-center px-10 py-32">
            <View className="mb-6 h-24 w-24 items-center justify-center rounded-full bg-gray-50 dark:bg-white/5">
              <Ionicons
                name="heart-outline"
                size={40}
                color={isDark ? "#4B5563" : "#9CA3AF"}
              />
            </View>

            <Text className="text-center text-xl font-bold text-gray-900 dark:text-white">
              Nothing saved yet
            </Text>
            <Text className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">
              Save products you like and come back to them later.
            </Text>

            <TouchableOpacity
              onPress={() => router.push("/(tabs)/home")}
              className="mt-8 rounded-2xl bg-brand px-8 py-4"
              activeOpacity={0.8}
            >
              <Text className="font-bold text-white">Browse Products</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
