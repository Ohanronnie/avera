import { useEffect, useMemo, useState } from "react";
import {
  View,
  Pressable,
  Image,
  Dimensions,
  ScrollView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  ImageSourcePropType,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/themed/theme";
import { router, useLocalSearchParams } from "expo-router";
import { Star } from "lucide-react-native";
import { useColorScheme } from "nativewind";
import { axiosInstance } from "@/utils/axios";
import { useToast } from "@/contexts/ToastContext";

const fallbackImage = require("@/assets/images/shoe.jpg");
const { width } = Dimensions.get("window");

type ProductImage = {
  id: number;
  url: string;
};

type ProductSeller = {
  id: number;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
  rating?: number;
  numReviews?: number;
};

type ProductDetails = {
  id: number;
  name: string;
  description: string;
  price: number | string;
  condition?: string | null;
  currency?: string | null;
  location?: string | null;
  rating?: number;
  numReviews?: number;
  isFeatured?: boolean;
  createdAt?: string;
  images?: ProductImage[];
  category?: {
    name?: string | null;
  } | null;
  seller?: ProductSeller | null;
};

const formatPrice = (value: number | string | undefined) => {
  const price = Number(value || 0);
  return `₦${price.toLocaleString()}`;
};

const getPostedLabel = (createdAt?: string) => {
  if (!createdAt) return "Recently";

  const createdDate = new Date(createdAt).getTime();
  const differenceInDays = Math.max(
    0,
    Math.floor((Date.now() - createdDate) / (1000 * 60 * 60 * 24)),
  );

  if (differenceInDays === 0) return "Today";
  if (differenceInDays === 1) return "Yesterday";
  if (differenceInDays < 7) return `${differenceInDays} days ago`;
  if (differenceInDays < 30) return `${Math.floor(differenceInDays / 7)} weeks ago`;

  return `${Math.floor(differenceInDays / 30)} months ago`;
};

const getSellerName = (seller?: ProductSeller | null) => {
  if (!seller) return "Avera Seller";

  const fullName = [seller.firstName, seller.lastName].filter(Boolean).join(" ");
  return fullName || seller.username || "Avera Seller";
};

export default function ProductDetailsPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const toast = useToast();

  const [product, setProduct] = useState<ProductDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;

      try {
        setLoading(true);
        const { data } = await axiosInstance.get("/products", {
          params: { productId: id },
        });

        setProduct(data);
      } catch (error: any) {
        toast.show({
          title: "Product not available",
          description: error?.response?.data?.message || "We couldn't load this product right now.",
          variant: "error",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id, toast]);

  const images = useMemo<ImageSourcePropType[]>(() => {
    const remoteImages = product?.images
      ?.map((image) => image.url)
      .filter(Boolean)
      .map((url) => ({ uri: url }));

    return remoteImages?.length ? remoteImages : [fallbackImage];
  }, [product?.images]);

  const price = Number(product?.price || 0);
  const sellerName = getSellerName(product?.seller);
  const productImageUrl = product?.images?.[0]?.url;

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-[#0A0A0A]">
        <ActivityIndicator color="#2563EB" size="small" />
        <Text className="mt-3 text-sm text-gray-500 dark:text-gray-400">
          Loading product...
        </Text>
      </View>
    );
  }

  if (!product) {
    return (
      <SafeAreaView className="flex-1 bg-white px-5 dark:bg-[#0A0A0A]">
        <Pressable
          onPress={() => router.back()}
          className="mt-3 h-11 w-11 items-center justify-center rounded-2xl border border-gray-100 bg-gray-50 dark:border-white/10 dark:bg-white/5"
        >
          <Ionicons name="chevron-back" size={24} color={isDark ? "white" : "#111"} />
        </Pressable>
        <View className="flex-1 items-center justify-center">
          <Text className="text-xl font-bold text-gray-900 dark:text-white">
            Product not found
          </Text>
          <Text className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">
            This item may have been removed or is temporarily unavailable.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View className="flex-1 bg-white dark:bg-[#0A0A0A]">
      <View className="relative h-[400px]">
        <FlatList
          data={images}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(_, index) => String(index)}
          onScroll={(e) => {
            const x = e.nativeEvent.contentOffset.x;
            setCurrentImageIndex(Math.round(x / width));
          }}
          renderItem={({ item }) => (
            <Image source={item} style={{ width, height: 400 }} resizeMode="cover" />
          )}
        />

        <SafeAreaView className="absolute left-0 right-0 top-0 flex-row items-center justify-between px-5">
          <Pressable
            onPress={() => router.back()}
            className="h-10 w-10 items-center justify-center rounded-full border border-gray-100/50 bg-white/90 dark:border-white/10 dark:bg-black/40"
          >
            <Ionicons name="chevron-back" size={24} color={isDark ? "white" : "#111"} />
          </Pressable>
          <View className="flex-row gap-x-3">
            <Pressable
              onPress={() => setIsBookmarked((current) => !current)}
              className="h-10 w-10 items-center justify-center rounded-full border border-gray-100/50 bg-white/90 dark:border-white/10 dark:bg-black/40"
            >
              <Ionicons
                name={isBookmarked ? "heart" : "heart-outline"}
                size={22}
                color={isBookmarked ? "#EF4444" : isDark ? "white" : "#111"}
              />
            </Pressable>
            <Pressable
              className="h-10 w-10 items-center justify-center rounded-full border border-gray-100/50 bg-white/90 dark:border-white/10 dark:bg-black/40"
              onPress={() =>
                toast.show({
                  title: "Coming soon",
                  description: "Sharing products will be available soon.",
                  variant: "info",
                })
              }
            >
              <Ionicons name="share-outline" size={22} color={isDark ? "white" : "#111"} />
            </Pressable>
          </View>
        </SafeAreaView>

        <View className="absolute bottom-6 w-full flex-row justify-center gap-x-2">
          {images.map((_, index) => (
            <View
              key={index}
              className={`h-1.5 rounded-full ${
                currentImageIndex === index ? "w-6 bg-brand" : "w-1.5 bg-white/60"
              }`}
            />
          ))}
        </View>
      </View>

      <ScrollView
        className="-mt-5 flex-1 bg-white dark:bg-[#0A0A0A]"
        showsVerticalScrollIndicator={false}
      >
        <View className="px-6 pb-32 pt-8">
          <View className="mb-3 flex-row items-center justify-between">
            <View className="rounded-full bg-brand/10 px-3 py-1">
              <Text className="text-[10px] font-bold uppercase tracking-widest text-brand">
                {product.condition || product.category?.name || "Product"}
              </Text>
            </View>
            <View className="flex-row items-center rounded-full border border-gray-100 px-3 py-1 dark:border-white/10">
              <Star size={12} color="#FACC15" fill="#FACC15" />
              <Text className="ml-1.5 text-xs font-bold text-gray-700 dark:text-gray-300">
                {Number(product.rating || 0).toFixed(1)}
              </Text>
            </View>
          </View>

          <Text className="text-[28px] font-bold leading-8 tracking-tight text-gray-900 dark:text-white">
            {product.name}
          </Text>
          <View className="mt-2 flex-row items-baseline">
            <Text className="text-2xl font-black text-brand">
              {formatPrice(product.price)}
            </Text>
            {price > 0 && (
              <Text className="ml-3 text-sm font-medium text-gray-400 line-through">
                {formatPrice(Math.round(price * 1.18))}
              </Text>
            )}
          </View>

          <View className="mt-6 flex-row items-center border-y border-gray-50 py-4 dark:border-white/5">
            <View className="flex-1 flex-row items-center">
              <Ionicons name="location-sharp" size={18} color="#2563EB" />
              <View className="ml-3">
                <Text className="text-xs font-medium text-gray-500">Location</Text>
                <Text className="text-sm font-bold text-black dark:text-white">
                  {product.location || "Nigeria"}
                </Text>
              </View>
            </View>
            <View className="flex-1 flex-row items-center border-l border-gray-100 pl-6 dark:border-white/5">
              <Ionicons name="time-outline" size={18} color="#2563EB" />
              <View className="ml-3">
                <Text className="text-xs font-medium text-gray-500">Posted</Text>
                <Text className="text-sm font-bold text-black dark:text-white">
                  {getPostedLabel(product.createdAt)}
                </Text>
              </View>
            </View>
          </View>

          <View className="mt-8">
            <Text className="mb-3 text-lg font-bold text-black dark:text-white">
              Item Description
            </Text>
            <Text
              className="text-sm leading-6 text-gray-500 dark:text-gray-400"
              numberOfLines={expanded ? undefined : 5}
            >
              {product.description}
            </Text>
            {product.description?.length > 180 && (
              <Pressable onPress={() => setExpanded((current) => !current)} className="mt-2">
                <Text className="text-sm font-bold text-brand">
                  {expanded ? "Show Less" : "Read More"}
                </Text>
              </Pressable>
            )}
          </View>

          <View className="mt-8 rounded-3xl border border-gray-100 bg-gray-50/50 p-5 dark:border-white/5 dark:bg-white/5">
            <View className="flex-row items-center justify-between">
              <View className="flex-1 flex-row items-center pr-3">
                {product.seller?.avatarUrl ? (
                  <Image
                    source={{ uri: product.seller.avatarUrl }}
                    className="h-12 w-12 rounded-2xl bg-gray-200 dark:bg-white/10"
                  />
                ) : (
                  <View className="h-12 w-12 items-center justify-center rounded-2xl bg-brand/10">
                    <Text className="text-base font-black uppercase text-brand">
                      {sellerName.slice(0, 1)}
                    </Text>
                  </View>
                )}
                <View className="ml-3 flex-1">
                  <Text className="font-bold text-black dark:text-white" numberOfLines={1}>
                    {sellerName}
                  </Text>
                  <Text className="text-[10px] font-bold uppercase tracking-tight text-gray-400">
                    Verified Seller
                  </Text>
                </View>
              </View>
              <TouchableOpacity className="rounded-xl border border-gray-100 bg-white px-4 py-2 dark:border-white/10 dark:bg-white/10">
                <Text className="text-sm font-bold text-black dark:text-white">Profile</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 flex-row gap-x-4 border-t border-gray-100 bg-white/95 px-6 py-6 dark:border-white/5 dark:bg-[#0A0A0A]/95">
        <TouchableOpacity
          onPress={() =>
            router.push({
              pathname: "/messages/[id]",
              params: {
                id: String(product.seller?.id || product.id),
                sellerName,
                productName: product.name,
                productPrice: formatPrice(product.price),
                ...(productImageUrl ? { productImage: productImageUrl } : {}),
              },
            })
          }
          className="h-16 w-16 items-center justify-center rounded-2xl border border-gray-200 bg-gray-100 dark:border-white/10 dark:bg-white/5"
        >
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={24}
            color={isDark ? "white" : "#111"}
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() =>
            toast.show({
              title: "Purchase flow coming soon",
              description: "We have the product ready. Checkout is the next piece to connect.",
              variant: "info",
            })
          }
          className="h-16 flex-1 items-center justify-center rounded-2xl bg-brand shadow-none"
        >
          <Text className="text-lg font-bold text-white">Buy Now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
