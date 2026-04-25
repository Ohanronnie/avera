import { AveraLoader } from "@/components/brand/AveraLoader";
import { ProductCard, IProduct } from "@/components/products/product-card";
import { Text } from "@/components/themed/theme";
import {
  PaginatedProductsResponse,
  mapProductToCard,
} from "@/features/products/types";
import { axiosInstance } from "@/utils/axios";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useColorScheme } from "nativewind";
import { useCallback, useEffect, useRef, useState } from "react";
import { FlatList, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const SELLER_LISTINGS_PAGE_SIZE = 10;

export default function SellerListingsScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const params = useLocalSearchParams<{
    id?: string;
    sellerName?: string;
  }>();

  const sellerId = params.id || "";
  const sellerName = params.sellerName || "Seller";
  const [listings, setListings] = useState<IProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasError, setHasError] = useState(false);
  const nextOffsetRef = useRef(0);
  const isFetchingRef = useRef(false);
  const hasNextPageRef = useRef(true);

  const fetchListingsPage = useCallback(
    async ({ reset = false }: { reset?: boolean } = {}) => {
      if (!sellerId) {
        setInitialLoading(false);
        setHasError(true);
        return;
      }
      if (isFetchingRef.current) return;
      if (!reset && !hasNextPageRef.current) return;

      isFetchingRef.current = true;
      const offset = reset ? 0 : nextOffsetRef.current;

      try {
        if (reset) {
          setInitialLoading(true);
          setHasError(false);
          hasNextPageRef.current = true;
          nextOffsetRef.current = 0;
        } else {
          setLoadingMore(true);
        }

        const { data } = await axiosInstance.get<PaginatedProductsResponse>(
          `/users/${sellerId}/listings`,
          {
            params: {
              limit: SELLER_LISTINGS_PAGE_SIZE,
              offset,
            },
          },
        );

        const nextListings = data.items.map(mapProductToCard);

        nextOffsetRef.current = offset + nextListings.length;
        setTotal(data.total);
        hasNextPageRef.current = data.hasMore;
        setListings((current) => {
          if (reset) return nextListings;

          const existingIds = new Set(current.map((product) => product.id));
          return [
            ...current,
            ...nextListings.filter((product) => !existingIds.has(product.id)),
          ];
        });
      } catch (error) {
        if (reset) setListings([]);
        setHasError(true);
        hasNextPageRef.current = false;
      } finally {
        setInitialLoading(false);
        setLoadingMore(false);
        isFetchingRef.current = false;
      }
    },
    [sellerId],
  );

  useEffect(() => {
    fetchListingsPage({ reset: true });
  }, [fetchListingsPage]);

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#0A0A0A]" edges={["top"]}>
      <View className="flex-row items-center border-b border-gray-100 bg-white px-5 py-4 dark:border-white/5 dark:bg-[#0A0A0A]">
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
        <View className="ml-4 flex-1">
          <Text className="text-2xl font-bold  text-gray-950 dark:text-white">
            {sellerName}'s listings
          </Text>
        </View>
      </View>

      {initialLoading ? (
        <View className="flex-1 items-center justify-center">
          <AveraLoader label="Loading listings" />
        </View>
      ) : hasError ? (
        <View className="flex-1 items-center justify-center px-10">
          <View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-gray-50 dark:bg-white/5">
            <Ionicons name="alert-circle-outline" size={32} color="#9CA3AF" />
          </View>
          <Text className="text-center text-lg font-bold text-gray-900 dark:text-white">
            Listings unavailable
          </Text>
          <Text className="mt-2 text-center text-sm text-gray-500">
            We couldn't load this seller's listings right now.
          </Text>
        </View>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(item) => String(item.id)}
          numColumns={2}
          columnWrapperStyle={{
            justifyContent: "space-between",
            paddingHorizontal: 20,
          }}
          contentContainerStyle={{ paddingTop: 24, paddingBottom: 32 }}
          renderItem={({ item }) => <ProductCard product={item} />}
          showsVerticalScrollIndicator={false}
          onEndReached={() => fetchListingsPage()}
          onEndReachedThreshold={0.45}
          ListHeaderComponent={
            <View className="mb-5 px-5">
              <View className="rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-white/5 dark:bg-white/5">
                <View className="flex-row items-center">
                  <View className="h-12 w-12 items-center justify-center rounded-2xl bg-brand/10">
                    <Text
                      variant="none"
                      className="text-lg font-semibold text-brand"
                    >
                      {sellerName.slice(0, 1).toUpperCase()}
                    </Text>
                  </View>
                  <View className="ml-3 flex-1">
                    <Text className="font-bold text-gray-950 dark:text-white">
                      {total} active listings
                    </Text>

                    <Text className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Browse available items from this seller.
                    </Text>
                  </View>
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={22}
                    color="#2563EB"
                  />
                </View>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View className="items-center justify-center px-10 py-20">
              <View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-gray-50 dark:bg-white/5">
                <Ionicons name="cube-outline" size={32} color="#9CA3AF" />
              </View>
              <Text className="text-center text-lg font-bold text-gray-900 dark:text-white">
                No listings yet
              </Text>
              <Text className="mt-2 text-center text-sm text-gray-500">
                This seller doesn't have active products available.
              </Text>
            </View>
          }
          ListFooterComponent={
            loadingMore ? (
              <View className="items-center justify-center py-6">
                <AveraLoader size={28} compact />
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}
