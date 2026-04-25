import { AveraLoader } from "@/components/brand/AveraLoader";
import { ProductCard, IProduct } from "@/components/products/product-card";
import { useMeQuery } from "@/features/profile/hooks";
import { useInventoryListingsQuery } from "@/features/seller/hooks";
import { Text } from "@/components/themed/theme";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useColorScheme } from "nativewind";
import { useMemo } from "react";
import { FlatList, Pressable, RefreshControl, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function InventoryScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const params = useLocalSearchParams<{
    userId?: string;
    sellerName?: string;
  }>();

  const { data: me, isLoading: loadingMe } = useMeQuery(!params.userId);
  const userId = params.userId || (me?.id ? String(me.id) : "");
  const displayName =
    params.sellerName ||
    me?.fullName ||
    [me?.firstName, me?.lastName].filter(Boolean).join(" ") ||
    "Your inventory";
  const {
    data,
    isLoading: loadingInventory,
    isError: hasError,
    isRefetching,
    hasNextPage,
    isFetchingNextPage: loadingMore,
    fetchNextPage,
    refetch,
  } = useInventoryListingsQuery(userId);
  const listings = useMemo<IProduct[]>(
    () => data?.pages.flatMap((page) => page.mappedItems) || [],
    [data],
  );
  const total = data?.pages[0]?.total || 0;
  const initialLoading = loadingMe || loadingInventory;

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
            onPress={() => {
              void refetch();
            }}
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
          refreshControl={
            <RefreshControl
              refreshing={isRefetching && !loadingMore}
              onRefresh={() => {
                void refetch();
              }}
              tintColor="#2563EB"
            />
          }
          onEndReached={() => {
            if (!hasNextPage || loadingMore) return;
            void fetchNextPage();
          }}
          onEndReachedThreshold={0.45}
          ListHeaderComponent={
            <View className="mb-5 px-5">
              <View className="rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-white/5 dark:bg-white/5">
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
