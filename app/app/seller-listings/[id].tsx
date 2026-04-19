import { ProductCard, IProduct } from "@/components/products/product-card";
import { Text } from "@/components/themed/theme";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useColorScheme } from "nativewind";
import { FlatList, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const fallbackListings: IProduct[] = [
  {
    id: 9101,
    title: "MacBook Pro 16 M2",
    price: 1850000,
    originalPrice: 2100000,
    rating: 4.8,
    reviews: 18,
    discount: "Featured",
    condition: "Foreign Used",
    location: "Lagos, Nigeria",
    onPress: () => void 0,
    onFavorite: () => void 0,
  },
  {
    id: 9102,
    title: "iPhone 15 Pro Max",
    price: 1450000,
    originalPrice: 1600000,
    rating: 4.7,
    reviews: 24,
    discount: "",
    condition: "New",
    location: "Lagos, Nigeria",
    onPress: () => void 0,
    onFavorite: () => void 0,
  },
  {
    id: 9103,
    title: "Sony WH-1000XM5",
    price: 385000,
    originalPrice: 430000,
    rating: 4.6,
    reviews: 11,
    discount: "",
    condition: "Local Used",
    location: "Lagos, Nigeria",
    onPress: () => void 0,
    onFavorite: () => void 0,
  },
];

export default function SellerListingsScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const params = useLocalSearchParams<{
    id?: string;
    sellerName?: string;
    productName?: string;
    productPrice?: string;
    productImage?: string;
  }>();

  const sellerName = params.sellerName || "Avera Seller";
  const currentListing: IProduct | null = params.productName
    ? {
        id: Number(params.id || 9000),
        title: params.productName,
        price:
          Number(String(params.productPrice || "0").replace(/[^0-9.]/g, "")) ||
          0,
        originalPrice: 0,
        rating: 4.8,
        reviews: 12,
        discount: "Current",
        condition: "Available",
        location: "Lagos, Nigeria",
        imageUrl: params.productImage,
        onPress: () => void 0,
        onFavorite: () => void 0,
      }
    : null;

  const listings = currentListing
    ? [currentListing, ...fallbackListings]
    : fallbackListings;

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
          <Text className="text-2xl font-black text-gray-950 dark:text-white">
            {sellerName}'s listings
          </Text>
        </View>
      </View>

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
        ListHeaderComponent={
          <View className="mb-5 px-5">
            <View className="rounded-3xl border border-gray-100 bg-gray-50 p-4 dark:border-white/5 dark:bg-white/5">
              <View className="flex-row items-center">
                <View className="h-12 w-12 items-center justify-center rounded-2xl bg-brand/10">
                  <Text
                    variant="none"
                    className="text-lg font-black text-brand"
                  >
                    {sellerName.slice(0, 1).toUpperCase()}
                  </Text>
                </View>
                <View className="ml-3 flex-1">
                  <Text className="font-bold text-gray-950 dark:text-white">
                    {listings.length} active listings
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
      />
    </SafeAreaView>
  );
}
