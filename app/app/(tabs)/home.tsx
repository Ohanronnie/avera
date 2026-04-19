import { ProductCard, IProduct } from "@/components/products/product-card";
import { Text } from "@/components/themed/theme";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { axiosInstance } from "@/utils/axios";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  View,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import Categories from "@/components/products/categories";
import { SafeAreaView } from "react-native-safe-area-context";
import { useColorScheme } from "nativewind";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type HomeProductSection = {
  key: string;
  title: string;
  subtitle: string;
  products: IProduct[];
};

const mapProductToCard = (item: any): IProduct => {
  const price = Number(item.price || 0);

  return {
    id: item.id,
    title: item.name,
    price,
    originalPrice: Math.round(price * 1.18),
    rating: item.rating || 0,
    reviews: item.numReviews || 0,
    onPress: () => void 0,
    onFavorite: () => void 0,
    discount: item.isFeatured ? "Featured" : "",
    condition: item.condition,
    location: item.location || "Nigeria",
    imageUrl: item.images?.[0]?.url,
  };
};

const buildHomeSections = (items: any[]): HomeProductSection[] => {
  const products = items.map(mapProductToCard);
  const featuredProducts = items
    .filter((item) => item.isFeatured)
    .map(mapProductToCard)
    .slice(0, 4);
  const budgetFinds = [...items]
    .sort((first, second) => Number(first.price || 0) - Number(second.price || 0))
    .map(mapProductToCard)
    .slice(0, 4);
  const premiumPicks = [...items]
    .sort((first, second) => Number(second.price || 0) - Number(first.price || 0))
    .map(mapProductToCard)
    .slice(0, 4);
  const usedDeals = items
    .filter((item) => item.condition && item.condition !== "New")
    .map(mapProductToCard)
    .slice(0, 4);

  return [
    {
      key: "popular",
      title: "Popular Products",
      subtitle: "The pieces getting the most attention right now.",
      products: products.slice(0, 4),
    },
    {
      key: "featured",
      title: "Featured Deals",
      subtitle: "Hand-picked items worth checking first.",
      products: featuredProducts.length ? featuredProducts : products.slice(4, 8),
    },
    {
      key: "budget",
      title: "Budget Finds",
      subtitle: "Good picks when you want value without stress.",
      products: budgetFinds,
    },
    {
      key: "premium",
      title: "Premium Picks",
      subtitle: "Higher-end listings for when quality matters.",
      products: premiumPicks,
    },
    {
      key: "used",
      title: "Pre-Owned Deals",
      subtitle: "Clean used items at friendlier prices.",
      products: usedDeals,
    },
  ].filter((section) => section.products.length > 0);
};

const sectionSearchParams: Record<string, Record<string, string>> = {
  popular: {},
  featured: { featured: "true" },
  budget: { sort: "budget" },
  premium: { sort: "premium" },
  used: { condition: "used" },
};

export default function HomeScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const IphoneImage = require("@/assets/images/566656.png");
  const ShoeImage = require("@/assets/images/shoe.jpg");
  const TechImage = require("@/assets/images/5252484.png");

  const router = useRouter();
  const [activeBanner, setActiveBanner] = useState(0);
  const [productSections, setProductSections] = useState<HomeProductSection[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);

  const banners = [
    {
      id: 1,
      title: "iPhone 16 Pro",
      subtitle: "The ultimate visual & power",
      label: "New Arrival",
      image: IphoneImage,
      color: "#2563EB",
    },
    {
      id: 2,
      title: "Air Max Pulse",
      subtitle: "Next generation of comfort",
      label: "Limited Edition",
      image: ShoeImage,
      color: "#3b82f6",
    },
    {
      id: 3,
      title: "Gadget Fest",
      subtitle: "Save up to 40% on tech",
      label: "Season Sale",
      image: TechImage,
      color: "#8b5cf6",
    },
  ];

  useEffect(() => {
    const fetchHomeProducts = async () => {
      try {
        setProductsLoading(true);
        const response = await axiosInstance.get("/products", {
          params: {
            limit: 20,
            offset: 0,
          },
        });

        setProductSections(buildHomeSections(response.data));
      } catch (error) {
        setProductSections([]);
      } finally {
        setProductsLoading(false);
      }
    };

    fetchHomeProducts();
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#0A0A0A]" edges={["top"]}>
      {/* Fixed Full-Width Header */}
      <View className="flex flex-row justify-between items-center px-5 py-4 border-b border-gray-100 dark:border-white/5 bg-white dark:bg-[#0A0A0A]">
        <Text className="text-3xl font-bold text-brand">Avera</Text>
        <View className="flex-row gap-x-2">
          <Pressable
            onPress={() => router.push("/product/search")}
            className="p-3 rounded-full bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5"
          >
            <Ionicons name="search-outline" size={20} color={isDark ? "white" : "#111"} />
          </Pressable>
          <Pressable className="p-3 rounded-full bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5">
            <Ionicons name="notifications-outline" size={20} color={isDark ? "white" : "#111"} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        className="flex-1 bg-white dark:bg-[#0A0A0A]"
        showsVerticalScrollIndicator={false}
      >
        {/* Banner Carousel */}
        <View className="mt-4">
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={(e) => {
              const x = e.nativeEvent.contentOffset.x;
              const index = Math.round(x / SCREEN_WIDTH);
              setActiveBanner(index);
            }}
            scrollEventThrottle={16}
          >
            {banners.map((banner) => (
              <View
                key={banner.id}
                style={{ width: SCREEN_WIDTH }}
                className="px-5"
              >
                <View
                  style={{ backgroundColor: banner.color }}
                  className="w-full h-44 flex-row rounded-3xl items-center overflow-hidden"
                >
                  <View className="w-[60%] pl-6 py-6 justify-center">
                    <View className="bg-white/20 self-start px-2 py-1 rounded-lg mb-2">
                      <Text className="text-[10px] font-bold text-white uppercase tracking-wider">
                        {banner.label}
                      </Text>
                    </View>
                    <Text className="text-2xl font-bold text-white leading-tight">
                      {banner.title}
                    </Text>
                    <Text className="text-xs mt-1 text-white/80 font-medium">
                      {banner.subtitle}
                    </Text>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      className="mt-4 bg-white self-start px-5 py-2.5 rounded-xl transition-all active:scale-95"
                    >
                      <Text
                        style={{ color: banner.color }}
                        className="text-sm font-bold"
                      >
                        Shop Now
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View className="w-[40%] items-end justify-center pr-2">
                    <Image
                      source={banner.image}
                      alt={banner.title}
                      className="w-36 h-36"
                      style={{ resizeMode: "contain" }}
                    />
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Pagination Indicators */}
          <View className="flex-row justify-center mt-3">
            {banners.map((_, i) => (
              <View
                key={i}
                className={`h-1.5 rounded-full mx-1 transition-all ${
                  activeBanner === i ? "w-6 bg-brand" : "w-1.5 bg-gray-200 dark:bg-white/10"
                }`}
              />
            ))}
          </View>
        </View>

        {/* Categories Section */}
        <View className="mt-6 px-5">
          <View className="flex flex-row justify-between items-center mb-4">
            <Text className="text-xl font-bold text-black dark:text-white">Categories</Text>
            <Pressable
              className="flex flex-row items-center"
              onPress={() => router.push("/product/categories")}
            >
              <Text className="text-sm font-semibold text-brand mr-1">
                See All
              </Text>
              <Ionicons name="chevron-forward" size={16} color="#2563EB" />
            </Pressable>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="-mx-5 px-5"
          >
            <View className="flex flex-row">
              <Categories limit={5} wrap={false} />
            </View>
          </ScrollView>
        </View>

        {/* Product Sections */}
        <View className="mt-8 pb-80">
          {productsLoading ? (
            <View className="mx-5 items-center justify-center rounded-3xl border border-gray-100 bg-gray-50 py-12 dark:border-white/5 dark:bg-white/5">
              <ActivityIndicator color="#2563EB" size="small" />
            </View>
          ) : productSections.length ? (
            productSections.map((section) => (
              <View key={section.key} className="mb-8 px-5">
                <View className="mb-4 flex-row items-end justify-between">
                  <View className="flex-1 pr-4">
                    <Text className="text-xl font-bold text-black dark:text-white">
                      {section.title}
                    </Text>
                    <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {section.subtitle}
                    </Text>
                  </View>
                  <Pressable
                    className="flex-row items-center pb-0.5"
                    onPress={() =>
                      router.push({
                        pathname: "/product/search",
                        params: {
                          section: section.title,
                          ...(sectionSearchParams[section.key] || {}),
                        },
                      })
                    }
                  >
                    <Text className="mr-1 text-sm font-semibold text-brand">
                      See All
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color="#2563EB" />
                  </Pressable>
                </View>
                <View className="flex-row flex-wrap justify-between">
                  {section.products.map((product) => (
                    <ProductCard
                      key={`${section.key}-${product.id}`}
                      product={product}
                    />
                  ))}
                </View>
              </View>
            ))
          ) : (
            <View className="mx-5 items-center justify-center rounded-3xl border border-gray-100 bg-gray-50 px-5 py-10 dark:border-white/5 dark:bg-white/5">
              <Text className="text-center text-base font-semibold text-gray-900 dark:text-white">
                No products yet
              </Text>
              <Text className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">
                Products you create will appear here.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
