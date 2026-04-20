import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useColorScheme } from "nativewind";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Text } from "@/components/themed/theme";
import { axiosInstance } from "@/utils/axios";
import { useQuery } from "@tanstack/react-query";


const sellerBadges = ["Verified seller", "Fast replies", "Escrow ready"];
const sellerDetails = async (userId: string) => {
  const response = await axiosInstance.get(`/users/${userId}`);
  return response.data;
};
export interface ISellerDetails {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  bio: string | null;
  avatarUrl: string | null;
  phoneNumber: string | null;
  location: {
    address: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    zipCode: string | null;
  };
  username: string;
  productsCount: number;
  averageRating: number;
}
export const useSellerDetails = (userId: string) => {
  return useQuery<ISellerDetails>({
    queryKey: ["sellerDetails", userId],
    queryFn: () => sellerDetails(userId),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });
};
export default function SellerProfileScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const params = useLocalSearchParams<{
    id?: string;
    sellerName?: string;
    productName?: string;
    productPrice?: string;
    productImage?: string;
  }>();
  const {
    data: sellerData,
    error,
    isLoading,
  } = useSellerDetails(params.id || "");
  const sellerName = params.sellerName || "Avera Seller";
  const openSellerListings = () => {
    router.push({
      pathname: "/seller-listings/[id]",
      params: {
        id: params.id || "seller",
        sellerName: sellerData
          ? `${sellerData.firstName} ${sellerData.lastName}`
          : sellerName,
       },
    });
  };
  const stats = [
    { label: "Listings", value: sellerData?.productsCount.toString() || "0" },
    { label: "Sold", value: "N/A" },
    { label: "Rating", value: sellerData?.averageRating.toFixed(1) || "0.0" },
  ];

console.log("Seller data:", sellerData?.location);
  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#0A0A0A]" edges={["top"]}>
      <View className="flex-row items-center justify-between border-b border-gray-100 bg-white px-5 py-4 dark:border-white/5 dark:bg-[#0A0A0A]">
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
        <Text className="text-lg font-bold text-gray-950 dark:text-white">
          Seller Profile
        </Text>
        <Pressable className="h-11 w-11 items-center justify-center rounded-full bg-gray-50 dark:bg-white/5">
          <Ionicons
            name="share-outline"
            size={20}
            color={isDark ? "white" : "#111827"}
          />
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-10 pt-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        {isLoading ? (
          <View className="flex-1 items-center justify-center px-10">
            <ActivityIndicator size={25} className="color-brand" />
          </View>
        ) : error ? (
          <View className="flex-1 items-center justify-center px-10">
            <View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-gray-50 dark:bg-white/5">
              <Ionicons name="search-outline" size={32} color="#9CA3AF" />
            </View>
            <Text className="text-center text-lg font-bold text-gray-900 dark:text-white">
              Seller not found
            </Text>
            <Text className="mt-2 text-center text-sm text-gray-500">
              We couldn't find the seller you're looking for.
            </Text>
          </View>
        ) : (
          sellerData && (
            <>
              <View className="items-center">
                <View className="h-24 w-24 items-center justify-center rounded-[32px] bg-brand/10">
                  <Text
                    variant="none"
                    className="text-4xl font-black text-brand"
                  >
                    {sellerData.firstName.slice(0, 1).toUpperCase()}
                  </Text>
                </View>
                <Text className="mt-4 text-3xl font-black text-gray-950 dark:text-white">
                  {sellerData.firstName} {sellerData.lastName}
                </Text>
                <View className="mt-2 flex-row items-center">
                  <View className="mr-2 h-2 w-2 rounded-full bg-emerald-500" />
                  <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                    Active today • {sellerData?.location.city || "Lagos"},{" "}
                    {sellerData?.location.country || "Nigeria"}
                  </Text>
                </View>
              </View>

              <View className="mt-6 flex-row rounded-3xl border border-gray-100 bg-gray-50 p-3 dark:border-white/5 dark:bg-white/5">
                {stats.map((item) => (
                  <View key={item.label} className="flex-1 items-center py-3">
                    <Text className="text-2xl font-black text-gray-950 dark:text-white">
                      {item.value}
                    </Text>
                    <Text className="mt-1 text-xs font-semibold text-gray-500 dark:text-gray-400">
                      {item.label}
                    </Text>
                  </View>
                ))}
              </View>

              <View className="mt-6">
                <Text className="mb-3 text-lg font-bold text-gray-950 dark:text-white">
                  Trust badges
                </Text>
                <View className="flex-row flex-wrap">
                  {sellerBadges.map((badge) => (
                    <View
                      key={badge}
                      className="mb-2 mr-2 flex-row items-center rounded-full bg-brand/10 px-4 py-2"
                    >
                      <Ionicons
                        name="shield-checkmark-outline"
                        size={15}
                        color="#2563EB"
                      />
                      <Text
                        variant="none"
                        className="ml-2 text-xs font-bold text-brand"
                      >
                        {badge}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>

              <View className="mt-6 rounded-3xl border border-gray-100 bg-white p-5 dark:border-white/5 dark:bg-white/5">
                <Text className="text-lg font-bold text-gray-950 dark:text-white">
                  About seller
                </Text>
                <Text className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
                 {sellerData.bio || "This seller hasn't added a bio yet."}
                </Text>
              </View>

              {params.productName && (
                <View className="mt-6">
                  <Text className="mb-3 text-lg font-bold text-gray-950 dark:text-white">
                    Current listing
                  </Text>
                  <View className="flex-row rounded-3xl border border-gray-100 bg-gray-50 p-3 dark:border-white/5 dark:bg-white/5">
                    {params.productImage ? (
                      <Image
                        source={{ uri: params.productImage }}
                        className="h-20 w-20 rounded-2xl bg-gray-200 dark:bg-white/10"
                      />
                    ) : (
                      <View className="h-20 w-20 items-center justify-center rounded-2xl bg-brand/10">
                        <Ionicons
                          name="cube-outline"
                          size={24}
                          color="#2563EB"
                        />
                      </View>
                    )}
                    <View className="ml-3 flex-1 justify-center">
                      <Text
                        numberOfLines={2}
                        className="font-bold text-gray-950 dark:text-white"
                      >
                        {params.productName}
                      </Text>
                      <Text className="mt-1 text-sm font-black text-brand">
                        {params.productPrice || "Price available"}
                      </Text>
                      <Text className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Listing attached to this conversation
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              <View className="mt-8 flex-row gap-3">
                <Pressable  className="h-14 flex-1 items-center justify-center rounded-2xl border border-gray-100 bg-gray-50 dark:border-white/10 dark:bg-white/5">
                  <Text className="font-bold text-gray-950 dark:text-white">
                    Message
                  </Text>
                </Pressable>
                <Pressable
                  onPress={openSellerListings}
                  className="h-14 flex-1 items-center justify-center rounded-2xl bg-brand"
                >
                  <Text variant="none" className="font-bold text-white">
                    View listings
                  </Text>
                </Pressable>
              </View>
            </>
          )
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
