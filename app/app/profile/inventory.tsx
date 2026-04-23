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

const INVENTORY_PAGE_SIZE = 10;

export default function InventoryScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const params = useLocalSearchParams<{
    userId?: string;
    sellerName?: string;
  }>();

  const [userId, setUserId] = useState(params.userId || "");
  const [displayName, setDisplayName] = useState(
    params.sellerName || "Your inventory",
  );
  const [listings, setListings] = useState<IProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasError, setHasError] = useState(false);
  const nextOffsetRef = useRef(0);
  const isFetchingRef = useRef(false);
  const hasNextPageRef = useRef(true);

  useEffect(() => {
    if (userId) return;

    let isMounted = true;

    axiosInstance
      .get("/users/me")
      .then(({ data }) => {
        if (!isMounted) return;
        setUserId(data.id ? String(data.id) : "");
        setDisplayName(
          data.fullName ||
            [data.firstName, data.lastName].filter(Boolean).join(" ") ||
            "Your inventory",
        );
      })
      .catch(() => {
        if (isMounted) {
          setHasError(true);
          setInitialLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [userId]);

  const fetchInventoryPage = useCallback(
    async ({ reset = false }: { reset?: boolean } = {}) => {
      if (!userId) return;
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
          `/users/${userId}/listings`,
          {
            params: {
              limit: INVENTORY_PAGE_SIZE,
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
    [userId],
  );

  useEffect(() => {
    fetchInventoryPage({ reset: true });
  }, [fetchInventoryPage]);

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
          <Text className="text-2xl font-bold text-gray-950 dark:text-white">
            My Inventory
          </Text>
        </View>
      </View>

      {initialLoading ? (
        <View className="flex-1 items-center justify-center">
          <AveraLoader label="Loading inventory" />
        </View>
      ) : hasError ? (
        <View className="flex-1 items-center justify-center px-10">
          <View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-gray-50 dark:bg-white/5">
            <Ionicons name="alert-circle-outline" size={32} color="#9CA3AF" />
          </View>
          <Text className="text-center text-lg font-bold text-gray-900 dark:text-white">
            Inventory unavailable
          </Text>
          <Text className="mt-2 text-center text-sm text-gray-500">
            We couldn't load your listed products right now.
          </Text>
          <Pressable
            onPress={() => fetchInventoryPage({ reset: true })}
            className="mt-8 rounded-2xl bg-brand px-8 py-4"
          >
            <Text className="font-bold text-white">Try Again</Text>
          </Pressable>
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
          onEndReached={() => fetchInventoryPage()}
          onEndReachedThreshold={0.45}
          ListHeaderComponent={
            <View className="mb-5 px-5">
              <View className="rounded-3xl border border-gray-100 bg-gray-50 p-4 dark:border-white/5 dark:bg-white/5">
                <View className="flex-row items-center">
                  <View className="h-12 w-12 items-center justify-center rounded-2xl bg-brand/10">
                    <Ionicons name="shirt-outline" size={22} color="#2563EB" />
                  </View>
                  <View className="ml-3 flex-1">
                    <Text className="font-bold text-gray-950 dark:text-white">
                      {total} active {total === 1 ? "listing" : "listings"}
                    </Text>
                    <Text className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Manage and review the products you have posted.
                    </Text>
                  </View>
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
                No inventory yet
              </Text>
              <Text className="mt-2 text-center text-sm text-gray-500">
                Products you list for sale will appear here.
              </Text>
              <Pressable
                onPress={() => router.push("/product/create")}
                className="mt-8 rounded-2xl bg-brand px-8 py-4"
              >
                <Text className="font-bold text-white">List a Product</Text>
              </Pressable>
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
