import { AveraLoader } from "@/components/brand/AveraLoader";
import { ProductCard } from "@/components/products/product-card";
import {
  flattenProductSearchPages,
  ProductFilters,
  useProductSearchQuery,
  useProductSearchSuggestionsQuery,
  useRecentProductSearches,
  useTrackProductSearchMutation,
  useTrendingKeywordsQuery,
} from "@/features/products/hooks";
import { Text } from "@/components/themed/theme";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Input, InputField } from "@/components/ui/input";
import { Feather, Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useColorScheme } from "nativewind";
import {
  FlatList,
  PanResponder,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSearchStore } from "@/stores/search-store";
const PRICE_RANGE_MIN = 0;
const PRICE_RANGE_MAX = 2000000;
const PRICE_RANGE_STEP = 50000;

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

const getInitialPrice = (value: string | undefined, fallback: number) => {
  const price = Number(value);
  if (!Number.isFinite(price)) return fallback;
  return Math.min(Math.max(price, PRICE_RANGE_MIN), PRICE_RANGE_MAX);
};

const clampPrice = (value: number) =>
  Math.min(Math.max(value, PRICE_RANGE_MIN), PRICE_RANGE_MAX);

const snapPrice = (value: number) =>
  Math.round(clampPrice(value) / PRICE_RANGE_STEP) * PRICE_RANGE_STEP;

const formatPrice = (price: number) => `₦${price.toLocaleString()}`;

const getInitialFilters = (params: {
  sort?: string;
  condition?: string;
  featured?: string;
  minPrice?: string;
  maxPrice?: string;
}): ProductFilters => {
  const minPrice = getInitialPrice(params.minPrice, PRICE_RANGE_MIN);
  const maxPrice = getInitialPrice(params.maxPrice, PRICE_RANGE_MAX);
  const hasValidPriceRange = minPrice + PRICE_RANGE_STEP <= maxPrice;

  return {
    condition:
      params.condition === "used" || params.condition === "new"
        ? params.condition
        : "all",
    sort:
      params.sort === "budget" || params.sort === "premium"
        ? params.sort
        : "newest",
    featured: params.featured === "true",
    minPrice: hasValidPriceRange ? minPrice : PRICE_RANGE_MIN,
    maxPrice: hasValidPriceRange ? maxPrice : PRICE_RANGE_MAX,
  };
};

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

const PriceRangeSlider = ({
  minPrice,
  maxPrice,
  onChange,
}: {
  minPrice: number;
  maxPrice: number;
  onChange: (range: { minPrice: number; maxPrice: number }) => void;
}) => {
  const [trackWidth, setTrackWidth] = useState(0);
  const trackRef = useRef<View>(null);
  const trackLayoutRef = useRef({ x: 0, width: 1 });
  const usableWidth = Math.max(trackWidth, 1);
  const valueRange = PRICE_RANGE_MAX - PRICE_RANGE_MIN;
  const minPercent = ((minPrice - PRICE_RANGE_MIN) / valueRange) * 100;
  const maxPercent = ((maxPrice - PRICE_RANGE_MIN) / valueRange) * 100;

  const measureTrack = useCallback((afterMeasure?: () => void) => {
    trackRef.current?.measureInWindow((x, _y, width) => {
      trackLayoutRef.current = { x, width: Math.max(width, 1) };
      setTrackWidth(width);
      afterMeasure?.();
    });
  }, []);

  const priceFromPageX = useCallback((pageX: number) => {
    const { x, width } = trackLayoutRef.current;
    const localX = Math.min(Math.max(pageX - x, 0), width);

    return snapPrice(
      PRICE_RANGE_MIN + (localX / width) * (PRICE_RANGE_MAX - PRICE_RANGE_MIN),
    );
  }, []);

  const updateMinPrice = useCallback(
    (pageX: number) => {
      const nextMinPrice = Math.min(
        priceFromPageX(pageX),
        maxPrice - PRICE_RANGE_STEP,
      );
      onChange({ minPrice: nextMinPrice, maxPrice });
    },
    [maxPrice, onChange, priceFromPageX],
  );

  const updateMaxPrice = useCallback(
    (pageX: number) => {
      const nextMaxPrice = Math.max(
        priceFromPageX(pageX),
        minPrice + PRICE_RANGE_STEP,
      );
      onChange({ minPrice, maxPrice: nextMaxPrice });
    },
    [minPrice, onChange, priceFromPageX],
  );

  const minPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => {
          const pageX = event.nativeEvent.pageX;
          measureTrack(() => updateMinPrice(pageX));
        },
        onPanResponderMove: (event) => {
          updateMinPrice(event.nativeEvent.pageX);
        },
      }),
    [measureTrack, updateMinPrice],
  );

  const maxPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => {
          const pageX = event.nativeEvent.pageX;
          measureTrack(() => updateMaxPrice(pageX));
        },
        onPanResponderMove: (event) => {
          updateMaxPrice(event.nativeEvent.pageX);
        },
      }),
    [measureTrack, updateMaxPrice],
  );

  const handleTrackPress = useCallback(
    (pageX: number) => {
      measureTrack(() => {
        const selectedPrice = priceFromPageX(pageX);
        const isCloserToMin =
          Math.abs(selectedPrice - minPrice) <=
          Math.abs(selectedPrice - maxPrice);

        if (isCloserToMin) {
          updateMinPrice(pageX);
        } else {
          updateMaxPrice(pageX);
        }
      });
    },
    [
      maxPrice,
      measureTrack,
      minPrice,
      priceFromPageX,
      updateMaxPrice,
      updateMinPrice,
    ],
  );

  return (
    <View className="mt-3">
      <View className="mb-3 flex-row items-center justify-between">
        <Text variant="none" className="text-sm font-bold text-brand">
          {formatPrice(minPrice)}
        </Text>
        <Text variant="none" className="text-sm font-bold text-brand">
          {formatPrice(maxPrice)}
        </Text>
      </View>
      <View
        ref={trackRef}
        className="h-12 justify-center"
        onLayout={(event) => {
          setTrackWidth(event.nativeEvent.layout.width);
          measureTrack();
        }}
        onTouchStart={(event) => handleTrackPress(event.nativeEvent.pageX)}
      >
        <View className="h-2 rounded-full bg-gray-100 dark:bg-white/10" />
        <View
          className="absolute h-2 rounded-full bg-brand"
          style={{
            left: `${minPercent}%`,
            right: `${100 - maxPercent}%`,
          }}
        />
        <View
          {...minPanResponder.panHandlers}
          className="absolute h-7 w-7 items-center justify-center rounded-full border-4 border-white bg-brand shadow-sm dark:border-[#1A1A1A]"
          style={{ left: `${minPercent}%`, transform: [{ translateX: -14 }] }}
        />
        <View
          {...maxPanResponder.panHandlers}
          className="absolute h-7 w-7 items-center justify-center rounded-full border-4 border-white bg-brand shadow-sm dark:border-[#1A1A1A]"
          style={{ left: `${maxPercent}%`, transform: [{ translateX: -14 }] }}
        />
      </View>
      <View className="mt-1 flex-row items-center justify-between">
        <Text className="text-xs text-gray-500 dark:text-gray-400">
          {formatPrice(PRICE_RANGE_MIN)}
        </Text>
        <Text className="text-xs text-gray-500 dark:text-gray-400">
          {formatPrice(PRICE_RANGE_MAX)}
        </Text>
      </View>
    </View>
  );
};

const SuggestionsScreen = ({
  onSearchTerm,
  recentSearches,
  trendingSearches,
  onClearRecentSearches,
  typing,
  suggestions,
  refreshing,
  onRefresh,
}: {
  onSearchTerm: (term: string) => void;
  recentSearches: string[];
  trendingSearches: string[];
  onClearRecentSearches: (index?: number) => void;
  typing?: boolean;
  suggestions?: string[];
  refreshing: boolean;
  onRefresh: () => void;
}) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const popularCategories = [
    { label: "Phones", icon: "phone-portrait-outline" },
    { label: "Laptops", icon: "laptop-outline" },
    { label: "Fashion", icon: "shirt-outline" },
    { label: "Gaming", icon: "game-controller-outline" },
  ];

  return (
    <ScrollView
      className="mx-4 mt-5"
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#2563EB"
        />
      }
    >
      {typing ? (
        <View className="mb-3 ">
          {suggestions?.map((item) => (
            <Pressable
              key={`suggestion-${item}`}
              onPress={() => {
                onSearchTerm(item);
              }}
              className="mb-2 flex-row items-center justify-between rounded-2xl  px-3 py-2"
            >
              <Text className="text-lg font-medium">{item}</Text>
              <Feather name="search" size={18} color="#888" />
            </Pressable>
          ))}
        </View>
      ) : (
        <>
          <View>
            <View className="mb-3 flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <Ionicons name="time-outline" size={16} color="#888" />
                <Text className="text-xl font-semibold">Recent searches</Text>
              </View>
              <Pressable onPress={() => onClearRecentSearches()}>
                <Text
                  variant="none"
                  className="text-sm font-semibold text-brand"
                >
                  Clear All
                </Text>
              </Pressable>
            </View>
            <View className="flex-row flex-wrap">
              {recentSearches.map((item, index) => (
                <View
                  key={item}
                  className="mr-2 mt-2 flex-row items-center justify-between rounded-2xl  bg-gray-100 px-3 py-2 dark:bg-white/5"
                >
                  <Pressable onPress={() => onSearchTerm(item)} className="">
                    <Text className="mr-1 text-sm">{item}</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => onClearRecentSearches(index)}
                    className="p-1"
                  >
                    <Ionicons name="close-outline" size={16} color="#888" />
                  </Pressable>
                </View>
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
                <View
                  key={`trending-${item}`}
                  className="mb-2 flex-row items-center justify-between rounded-2xl  px-3 py-2  bg-gray-100 px-3 py-2 dark:bg-white/5"
                >
                  <Pressable onPress={() => onSearchTerm(item)} className="">
                    <Text className="text-lg font-medium">{item}</Text>
                  </Pressable>
                  <Feather name="trending-up" size={18} color="#888" />
                </View>
              ))}
            </View>
          </View>

          <View className="mt-12">
            <View className="mb-4 flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <Ionicons name="grid-outline" size={16} color="#888" />
                <Text className="text-xl font-semibold">
                  Popular Categories
                </Text>
              </View>
              <Pressable onPress={() => router.push("/product/categories")}>
                <Text
                  variant="none"
                  className="text-sm font-semibold text-brand"
                >
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
        </>
      )}
    </ScrollView>
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
    minPrice?: string;
    maxPrice?: string;
  }>();
  const searchQuery = useSearchStore((state) => state.searchQuery);
  const activeQuery = useSearchStore((state) => state.activeQuery);
  const filterSheetOpen = useSearchStore((state) => state.filterSheetOpen);
  const filters = useSearchStore((state) => state.filters);
  const draftFilters = useSearchStore((state) => state.draftFilters);
  const showSuggestions = useSearchStore((state) => state.showSuggestions);
  const typing = useSearchStore((state) => state.typing);
  const setSearchQuery = useSearchStore((state) => state.setSearchQuery);
  const setActiveQuery = useSearchStore((state) => state.setActiveQuery);
  const setFilters = useSearchStore((state) => state.setFilters);
  const setDraftFilters = useSearchStore((state) => state.setDraftFilters);
  const setFilterSheetOpen = useSearchStore(
    (state) => state.setFilterSheetOpen,
  );
  const setShowSuggestions = useSearchStore(
    (state) => state.setShowSuggestions,
  );
  const setTyping = useSearchStore((state) => state.setTyping);
  const syncFromRoute = useSearchStore((state) => state.syncFromRoute);
  const resetStoredFilters = useSearchStore((state) => state.resetFilters);
  const deferredSearchQuery = useDeferredValue(searchQuery.trim());
  const {
    recentSearches,
    clearRecentSearches,
    addRecentSearch,
    isLoading: recentSearchesLoading,
    refetch: refetchRecentSearches,
  } = useRecentProductSearches();
  const { data: trendingSearches = [], refetch: refetchTrendingSearches } =
    useTrendingKeywordsQuery(8);
  const { mutate: trackProductSearch } = useTrackProductSearchMutation();
  const {
    data: searchResults,
    isLoading: initialLoading,
    isRefetching,
    isFetchingNextPage: loadingMore,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useProductSearchQuery({
    query: activeQuery,
    categoryId: params.categoryId,
    filters,
  });
  const { data: suggestions = [] } = useProductSearchSuggestionsQuery(
    deferredSearchQuery,
    typing,
  );
  const products = useMemo(
    () => flattenProductSearchPages(searchResults),
    [searchResults],
  );

  useEffect(() => {
    const nextQuery = params.query || "";
    const nextFilters = getInitialFilters(params);
    syncFromRoute({
      query: nextQuery,
      hasContext: Boolean(params.query || params.categoryId || params.section),
      filters: nextFilters,
    });
  }, [
    params.categoryId,
    params.condition,
    params.featured,
    params.query,
    params.section,
    params.sort,
    params.maxPrice,
    params.minPrice,
    syncFromRoute,
  ]);

  const submitSearch = (nextQuery = searchQuery) => {
    const submittedQuery = nextQuery.trim();
    setActiveQuery(submittedQuery);
    setShowSuggestions(false);
    void addRecentSearch(submittedQuery);

    if (submittedQuery.length >= 2) {
      trackProductSearch(submittedQuery);
    }
  };

  const handleSearchTerm = (term: string) => {
    setSearchQuery(term);
    submitSearch(term);
  };

  const applyFilters = () => {
    setFilters(draftFilters);
    setFilterSheetOpen(false);
  };

  const resetFilters = () => {
    resetStoredFilters();
  };
  const activeFilterCount =
    (filters.condition !== "all" ? 1 : 0) +
    (filters.sort !== "newest" ? 1 : 0) +
    (filters.featured ? 1 : 0) +
    (filters.minPrice > PRICE_RANGE_MIN || filters.maxPrice < PRICE_RANGE_MAX
      ? 1
      : 0);

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
            onChangeText={(text) => {
              setSearchQuery(text);
              setTyping(text.length > 0);
            }}
            onFocus={() => {
              setShowSuggestions(true);
            }}
            onBlur={() => setTyping(false)}
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
                className="text-[10px] font-semibold text-white"
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
            <AveraLoader />
          </View>
        ) : showSuggestions ? (
          <SuggestionsScreen
            suggestions={suggestions}
            onSearchTerm={handleSearchTerm}
            recentSearches={recentSearches}
            trendingSearches={trendingSearches}
            onClearRecentSearches={(index) => {
              void clearRecentSearches(index);
            }}
            typing={typing}
            refreshing={recentSearchesLoading || isRefetching}
            onRefresh={() => {
              void refetchRecentSearches();
              void refetchTrendingSearches();
            }}
          />
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
                  <AveraLoader size={28} compact />
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
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={() => {
                  void refetch();
                }}
                tintColor="#2563EB"
              />
            }
            onEndReached={() => {
              if (hasNextPage && !loadingMore) {
                void fetchNextPage();
              }
            }}
            onEndReachedThreshold={0.45}
          />
        ) : (
          <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={() => {
                  void refetch();
                  void refetchTrendingSearches();
                }}
                tintColor="#2563EB"
              />
            }
          >
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
          </ScrollView>
        )}
      </View>

      <BottomSheet
        visible={filterSheetOpen}
        coverTabs
        title="Filter products"
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
                    setDraftFilters({
                      ...draftFilters,
                      condition: option.value,
                    })
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
                    setDraftFilters({
                      ...draftFilters,
                      sort: option.value,
                    })
                  }
                />
              ))}
            </View>
          </View>

          <View className="mt-6">
            <Text className="text-base font-bold text-gray-950 dark:text-white">
              Price range
            </Text>
            <PriceRangeSlider
              minPrice={draftFilters.minPrice}
              maxPrice={draftFilters.maxPrice}
              onChange={(range) =>
                setDraftFilters({
                  ...draftFilters,
                  ...range,
                })
              }
            />
          </View>

          {/* <Pressable
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
          </Pressable> */}

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
