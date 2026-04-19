import { ProductCard, IProduct } from "@/components/products/product-card";
import { Text } from "@/components/themed/theme";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Input, InputField } from "@/components/ui/input";
import { axiosInstance } from "@/utils/axios";
import { Feather, Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useColorScheme } from "nativewind";
import { ActivityIndicator, FlatList, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const PRODUCT_PAGE_SIZE = 10;

type ProductFilters = {
  condition: "all" | "new" | "used";
  sort: "newest" | "budget" | "premium";
  featured: boolean;
};

const conditionOptions: Array<{
  label: string;
  value: ProductFilters["condition"];
}> = [
  { label: "All", value: "all" },
  { label: "New", value: "new" },
  { label: "Used", value: "used" },
];

const sortOptions: Array<{ label: string; value: ProductFilters["sort"] }> = [
  { label: "Newest", value: "newest" },
  { label: "Budget", value: "budget" },
  { label: "Premium", value: "premium" },
];

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

const getInitialFilters = (params: {
  sort?: string;
  condition?: string;
  featured?: string;
}): ProductFilters => ({
  condition:
    params.condition === "used" || params.condition === "new"
      ? params.condition
      : "all",
  sort:
    params.sort === "budget" || params.sort === "premium"
      ? params.sort
      : "newest",
  featured: params.featured === "true",
});

const FilterChip = ({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) => (
  <Pressable
    onPress={onPress}
    className={`mr-2 mt-2 rounded-full border px-4 py-2 ${
      active
        ? "border-brand bg-brand"
        : "border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-white/5"
    }`}
  >
    <Text
      variant="none"
      className={`text-sm font-bold ${
        active ? "text-white" : "text-gray-700 dark:text-gray-300"
      }`}
    >
      {label}
    </Text>
  </Pressable>
);

const SuggestionsScreen = ({
  onSearchTerm,
}: {
  onSearchTerm: (term: string) => void;
}) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const recentSearches = ["IPhone 15 Pro", "MacBook Pro 16", "AirPods Max"];
  const trendingSearches = [
    "iPhone 14 Pro Max",
    "MacBook Air M2",
    "AirPods Pro",
  ];
  const popularCategories = [
    { label: "Phones", icon: "phone-portrait-outline" },
    { label: "Laptops", icon: "laptop-outline" },
    { label: "Fashion", icon: "shirt-outline" },
    { label: "Gaming", icon: "game-controller-outline" },
  ];

  return (
    <View className="mx-4 mt-5">
      <View>
        <View className="mb-3 flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <Ionicons name="time-outline" size={16} color="#888" />
            <Text className="text-xl font-semibold">Recent searches</Text>
          </View>
          <Text variant="none" className="text-sm font-semibold text-brand">
            Clear All
          </Text>
        </View>
        <View className="flex-row flex-wrap">
          {recentSearches.map((item) => (
            <Pressable
              key={item}
              onPress={() => onSearchTerm(item)}
              className="mr-2 mt-2 flex-row items-center justify-between rounded-xl bg-gray-100 px-3 py-2 dark:bg-white/5"
            >
              <Text className="mr-1 text-sm">{item}</Text>
              <Ionicons name="close-outline" size={16} color="#888" />
            </Pressable>
          ))}
        </View>
      </View>

      <View className="mt-12">
        <View className="mb-3 flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <Feather name="trending-up" size={16} color="#888" />
            <Text className="text-xl font-semibold">Trending searches</Text>
          </View>
        </View>
        <View>
          {trendingSearches.map((item) => (
            <Pressable
              key={item}
              onPress={() => onSearchTerm(item)}
              className="mt-2 flex-row items-center justify-between rounded-xl bg-gray-100 px-3 py-3 dark:bg-white/5"
            >
              <Text className="text-sm font-medium">{item}</Text>
              <Feather name="trending-up" size={16} color="#888" />
            </Pressable>
          ))}
        </View>
      </View>

      <View className="mt-12">
        <View className="mb-4 flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <Ionicons name="grid-outline" size={16} color="#888" />
            <Text className="text-xl font-semibold">Popular Categories</Text>
          </View>
          <Pressable onPress={() => router.push("/product/categories")}>
            <Text variant="none" className="text-sm font-semibold text-brand">
              See All
            </Text>
          </Pressable>
        </View>
        <View className="flex-row flex-wrap justify-between">
          {popularCategories.map((item) => (
            <View
              key={item.label}
              className="mb-4 w-[25%] items-center justify-center"
            >
              <Pressable
                onPress={() => onSearchTerm(item.label)}
                className="h-20 w-20 items-center justify-center rounded-full border border-gray-100 bg-background-50 dark:border-white/5 dark:bg-white/5"
              >
                <Ionicons
                  name={item.icon as any}
                  size={28}
                  color={isDark ? "white" : "black"}
                />
              </Pressable>
              <Text className="mt-2 text-center text-sm font-medium">
                {item.label}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

export default function SearchScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const params = useLocalSearchParams<{
    query?: string;
    categoryId?: string;
    categoryName?: string;
    section?: string;
    sort?: string;
    condition?: string;
    featured?: string;
  }>();
  const [searchQuery, setSearchQuery] = useState(params.query || "");
  const [activeQuery, setActiveQuery] = useState(params.query || "");
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [filters, setFilters] = useState<ProductFilters>(() =>
    getInitialFilters(params),
  );
  const [draftFilters, setDraftFilters] = useState<ProductFilters>(() =>
    getInitialFilters(params),
  );
  const [showSuggestions, setShowSuggestions] = useState(
    !params.query && !params.categoryId && !params.section,
  );
  const [initialLoading, setInitialLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [products, setProducts] = useState<IProduct[]>([]);
  const nextOffsetRef = useRef(0);
  const requestIdRef = useRef(0);
  const isFetchingRef = useRef(false);

  const fetchProductsPage = useCallback(
    async ({
      nextQuery = activeQuery,
      reset = false,
      nextFilters = filters,
    }: {
      nextQuery?: string;
      reset?: boolean;
      nextFilters?: ProductFilters;
    } = {}) => {
      if (isFetchingRef.current) return;
      if (!reset && !hasNextPage) return;

      isFetchingRef.current = true;
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      const offset = reset ? 0 : nextOffsetRef.current;

      try {
        if (reset) {
          setInitialLoading(true);
          setHasNextPage(true);
          nextOffsetRef.current = 0;
        } else {
          setLoadingMore(true);
        }

        setShowSuggestions(false);

        const { data } = await axiosInstance.get("/products", {
          params: {
            query: nextQuery || "",
            limit: PRODUCT_PAGE_SIZE,
            offset,
            ...(params.categoryId ? { categoryId: params.categoryId } : {}),
            ...(nextFilters.featured ? { featured: "true" } : {}),
            ...(nextFilters.condition !== "all"
              ? { condition: nextFilters.condition }
              : {}),
            ...(nextFilters.sort !== "newest"
              ? { sort: nextFilters.sort }
              : {}),
          },
        });

        if (requestId !== requestIdRef.current) return;

        const nextProducts = data.map(mapProductToCard);
        nextOffsetRef.current = offset + data.length;
        setHasNextPage(data.length === PRODUCT_PAGE_SIZE);
        setProducts((current) => {
          if (reset) return nextProducts;

          const existingIds = new Set(current.map((product) => product.id));
          return [
            ...current,
            ...nextProducts.filter((product) => !existingIds.has(product.id)),
          ];
        });
      } catch (error) {
        if (reset) setProducts([]);
        setHasNextPage(false);
      } finally {
        if (requestId === requestIdRef.current) {
          setInitialLoading(false);
          setLoadingMore(false);
        }
        isFetchingRef.current = false;
      }
    },
    [
      activeQuery,
      hasNextPage,
      filters.condition,
      filters.featured,
      filters.sort,
      params.categoryId,
    ],
  );

  useEffect(() => {
    const nextQuery = params.query || "";
    const nextFilters = getInitialFilters(params);
    setSearchQuery(nextQuery);
    setActiveQuery(nextQuery);
    setFilters(nextFilters);
    setDraftFilters(nextFilters);

    if (params.query || params.categoryId || params.section) {
      fetchProductsPage({ nextQuery, reset: true, nextFilters });
    } else {
      setShowSuggestions(true);
      setProducts([]);
      setHasNextPage(true);
      nextOffsetRef.current = 0;
    }
  }, [
    params.categoryId,
    params.condition,
    params.featured,
    params.query,
    params.section,
    params.sort,
  ]);

  const submitSearch = (nextQuery = searchQuery) => {
    setActiveQuery(nextQuery);
    fetchProductsPage({ nextQuery, reset: true });
  };

  const handleSearchTerm = (term: string) => {
    setSearchQuery(term);
    submitSearch(term);
  };

  const applyFilters = () => {
    setFilters(draftFilters);
    setFilterSheetOpen(false);
    fetchProductsPage({
      nextQuery: activeQuery,
      reset: true,
      nextFilters: draftFilters,
    });
  };

  const resetFilters = () => {
    const nextFilters: ProductFilters = {
      condition: "all",
      sort: "newest",
      featured: false,
    };

    setDraftFilters(nextFilters);
    setFilters(nextFilters);
    setFilterSheetOpen(false);
    fetchProductsPage({ nextQuery: activeQuery, reset: true, nextFilters });
  };

  const activeFilterCount =
    (filters.condition !== "all" ? 1 : 0) +
    (filters.sort !== "newest" ? 1 : 0) +
    (filters.featured ? 1 : 0);

  const title = params.categoryName || params.section || "All Products";

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#0A0A0A]">
      <View className="flex-row items-center justify-between gap-x-2 border-b border-gray-200 bg-white px-4 py-4 dark:border-white/5 dark:bg-[#0A0A0A]">
        <Pressable
          className="items-center justify-center rounded-full border border-gray-200 bg-gray-50 p-2.5 dark:border-white/10 dark:bg-white/5"
          onPress={() => router.back()}
        >
          <Ionicons
            name="arrow-back"
            size={18}
            color={isDark ? "white" : "#666"}
          />
        </Pressable>

        <Input className="h-12 flex-1 flex-row items-center rounded-full border border-gray-200 bg-gray-50 px-4 dark:border-white/10 dark:bg-white/5">
          <InputField
            placeholder={
              params.categoryName
                ? `Search in "${params.categoryName}"`
                : "Search for items..."
            }
            className="flex-1 text-base text-black dark:text-white"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setShowSuggestions(true)}
            placeholderTextColor="#888"
            returnKeyType="search"
            onSubmitEditing={() => submitSearch()}
          />
        </Input>

        <Pressable
          className="items-center justify-center rounded-full border border-gray-200 bg-gray-50 p-2.5 dark:border-white/10 dark:bg-white/5"
          onPress={() => submitSearch()}
        >
          <Ionicons
            name="search-outline"
            size={18}
            color={isDark ? "white" : "#666"}
          />
        </Pressable>

        <Pressable
          className="relative items-center justify-center rounded-full border border-gray-200 bg-gray-50 p-2.5 dark:border-white/10 dark:bg-white/5"
          onPress={() => {
            setDraftFilters(filters);
            setFilterSheetOpen(true);
          }}
        >
          <Ionicons
            name="options-outline"
            size={18}
            color={isDark ? "white" : "#666"}
          />
          {activeFilterCount > 0 && (
            <View className="absolute -right-1 -top-1 h-5 w-5 items-center justify-center rounded-full bg-brand">
              <Text
                variant="none"
                className="text-[10px] font-black text-white"
              >
                {activeFilterCount}
              </Text>
            </View>
          )}
        </Pressable>
      </View>

      <View className="flex-1">
        {initialLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#2563EB" />
          </View>
        ) : showSuggestions ? (
          <SuggestionsScreen onSearchTerm={handleSearchTerm} />
        ) : products.length > 0 ? (
          <FlatList
            data={products}
            keyExtractor={(item) => String(item.id)}
            numColumns={2}
            ListHeaderComponent={
              <View className="mb-5 px-4">
                <Text className="text-2xl font-bold text-black dark:text-white">
                  {title}
                </Text>
                <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Showing {products.length} products
                </Text>
              </View>
            }
            ListFooterComponent={
              loadingMore ? (
                <View className="items-center justify-center py-6">
                  <ActivityIndicator color="#2563EB" size="small" />
                </View>
              ) : null
            }
            columnWrapperStyle={{
              justifyContent: "space-between",
              paddingHorizontal: 16,
            }}
            contentContainerStyle={{ paddingVertical: 20 }}
            renderItem={({ item }) => <ProductCard product={item} />}
            showsVerticalScrollIndicator={false}
            onEndReached={() => fetchProductsPage()}
            onEndReachedThreshold={0.45}
          />
        ) : (
          <View className="flex-1 items-center justify-center px-10">
            <View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-gray-50 dark:bg-white/5">
              <Ionicons name="search-outline" size={32} color="#9CA3AF" />
            </View>
            <Text className="text-center text-lg font-bold text-gray-900 dark:text-white">
              No results found
            </Text>
            <Text className="mt-2 text-center text-sm text-gray-500">
              Try another search term or browse a different category.
            </Text>
          </View>
        )}
      </View>

      <BottomSheet
        visible={filterSheetOpen}
        coverTabs
        title="Filter products"
        subtitle="Narrow the list without losing infinite scroll."
        onClose={() => setFilterSheetOpen(false)}
      >
        <View>
          <View>
            <Text className="text-base font-bold text-gray-950 dark:text-white">
              Condition
            </Text>
            <View className="mt-2 flex-row flex-wrap">
              {conditionOptions.map((option) => (
                <FilterChip
                  key={option.value}
                  label={option.label}
                  active={draftFilters.condition === option.value}
                  onPress={() =>
                    setDraftFilters((current) => ({
                      ...current,
                      condition: option.value,
                    }))
                  }
                />
              ))}
            </View>
          </View>

          <View className="mt-6">
            <Text className="text-base font-bold text-gray-950 dark:text-white">
              Sort by
            </Text>
            <View className="mt-2 flex-row flex-wrap">
              {sortOptions.map((option) => (
                <FilterChip
                  key={option.value}
                  label={option.label}
                  active={draftFilters.sort === option.value}
                  onPress={() =>
                    setDraftFilters((current) => ({
                      ...current,
                      sort: option.value,
                    }))
                  }
                />
              ))}
            </View>
          </View>

          <Pressable
            onPress={() =>
              setDraftFilters((current) => ({
                ...current,
                featured: !current.featured,
              }))
            }
            className="mt-6 flex-row items-center justify-between rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-white/10 dark:bg-white/5"
          >
            <View className="flex-row items-center">
              <View className="h-11 w-11 items-center justify-center rounded-2xl bg-brand/10">
                <Ionicons name="sparkles-outline" size={20} color="#2563EB" />
              </View>
              <View className="ml-3">
                <Text className="font-bold text-gray-950 dark:text-white">
                  Featured only
                </Text>
                <Text className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Show hand-picked listings first.
                </Text>
              </View>
            </View>
            <View
              className={`h-7 w-12 rounded-full p-1 ${
                draftFilters.featured
                  ? "bg-brand"
                  : "bg-gray-300 dark:bg-white/20"
              }`}
            >
              <View
                className={`h-5 w-5 rounded-full bg-white ${
                  draftFilters.featured ? "ml-5" : "ml-0"
                }`}
              />
            </View>
          </Pressable>

          <View className="mt-8 flex-row gap-3">
            <Pressable
              onPress={resetFilters}
              className="h-14 flex-1 items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-white/5"
            >
              <Text className="font-bold text-gray-900 dark:text-white">
                Reset
              </Text>
            </Pressable>
            <Pressable
              onPress={applyFilters}
              className="h-14 flex-1 items-center justify-center rounded-2xl bg-brand"
            >
              <Text variant="none" className="font-bold text-white">
                Apply filters
              </Text>
            </Pressable>
          </View>
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}
