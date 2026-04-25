import { IProduct } from "@/components/products/product-card";
import { ApiProduct, mapProductToCard } from "@/features/products/types";
import { axiosInstance } from "@/utils/axios";
import {
  InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { createMMKV } from "react-native-mmkv";

const HOME_PRODUCT_LIMIT = 20;
const PRODUCT_PAGE_SIZE = 10;
const RECENT_SEARCHES_KEY = "recentSearches";
const fallbackTrendingSearches = [
  "iPhone 14 Pro Max",
  "MacBook Air M2",
  "AirPods Pro",
  "Nike Air Max 270",
];

type RecentSearchesStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
};

const recentSearchesMMKV = createMMKV({ id: "avera-recent-searches" });

const recentSearchesStorage: RecentSearchesStorage = {
  getItem: async (key) => recentSearchesMMKV.getString(key) ?? null,
  setItem: async (key, value) => {
    recentSearchesMMKV.set(key, value);
  },
};

export type ProductImage = {
  id: number;
  url: string;
};

export type ProductSeller = {
  id: number;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
  rating?: number;
  numReviews?: number;
};

export type ProductDetails = {
  id: number;
  name: string;
  description: string;
  price: number | string;
  condition?: string | null;
  currency?: string | null;
  location?: string | null;
  quantity?: number;
  rating?: number;
  numReviews?: number;
  isFeatured?: boolean;
  createdAt?: string;
  images?: ProductImage[];
  category?: {
    name?: string | null;
  } | null;
  seller?: ProductSeller | null;
  isWishlisted?: boolean;
  isOwner?: boolean;
};

export type ActiveCheckoutOrder = {
  id: number;
  code?: string;
  conversationId?: number | null;
  offerMessageId?: number | null;
  source?: string;
  status?: string;
  statusText?: string;
  quantity?: number;
  unitPrice?: number;
};

export type ProductFilters = {
  condition: "all" | "new" | "used";
  sort: "newest" | "budget" | "premium";
  featured: boolean;
  minPrice: number;
  maxPrice: number;
};

export type ProductSearchParams = {
  query?: string;
  categoryId?: string;
  filters: ProductFilters;
};

export type HomeProductSection = {
  key: string;
  title: string;
  subtitle: string;
  products: IProduct[];
};

export const productKeys = {
  all: ["products"] as const,
  detail: (productId: number) => ["products", "detail", productId] as const,
  currentOrder: (productId: number) =>
    ["products", "current-order", productId] as const,
  home: () => ["products", "home"] as const,
  search: (params: ProductSearchParams) =>
    ["products", "search", params] as const,
  trendingKeywords: (limit: number) =>
    ["products", "trending-keywords", limit] as const,
  suggestions: (query: string) =>
    ["products", "search-suggestions", query] as const,
  recentSearches: () => ["products", "recent-searches"] as const,
};

const buildHomeSections = (items: ApiProduct[]): HomeProductSection[] => {
  const products = items.map(mapProductToCard);
  const featuredProducts = items
    .filter((item) => item.isFeatured)
    .map(mapProductToCard)
    .slice(0, 4);
  const budgetFinds = [...items]
    .sort(
      (first, second) => Number(first.price || 0) - Number(second.price || 0),
    )
    .map(mapProductToCard)
    .slice(0, 4);
  const premiumPicks = [...items]
    .sort(
      (first, second) => Number(second.price || 0) - Number(first.price || 0),
    )
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
      products: featuredProducts.length
        ? featuredProducts
        : products.slice(4, 8),
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

const loadRecentSearches = async () => {
  try {
    const storedSearches =
      await recentSearchesStorage.getItem(RECENT_SEARCHES_KEY);
    if (!storedSearches) return [];

    const parsedSearches = JSON.parse(storedSearches);
    return Array.isArray(parsedSearches)
      ? parsedSearches.filter(
          (item): item is string => typeof item === "string",
        )
      : [];
  } catch (error) {
    console.error("Failed to load recent searches:", error);
    return [];
  }
};

const saveRecentSearches = async (searches: string[]) => {
  try {
    await recentSearchesStorage.setItem(
      RECENT_SEARCHES_KEY,
      JSON.stringify(searches),
    );
  } catch (error) {
    console.error("Failed to save recent searches:", error);
  }
};

const fetchProductDetails = async (productId: number) => {
  const { data } = await axiosInstance.get<ProductDetails>("/products", {
    params: { productId },
  });

  return data;
};

const fetchCurrentOrder = async (productId: number) => {
  const { data } = await axiosInstance.get<ActiveCheckoutOrder | null>(
    "/orders/current",
    {
      params: {
        productId,
        source: "BUY_NOW",
      },
    },
  );

  return data;
};

const fetchHomeProducts = async () => {
  const { data } = await axiosInstance.get<ApiProduct[]>("/products", {
    params: {
      limit: HOME_PRODUCT_LIMIT,
      offset: 0,
    },
  });

  return data;
};

const fetchProductSearchPage = async ({
  pageParam,
  query,
  categoryId,
  filters,
}: {
  pageParam: number;
  query?: string;
  categoryId?: string;
  filters: ProductFilters;
}) => {
  const { data } = await axiosInstance.get<ApiProduct[]>("/products", {
    params: {
      query: query || "",
      limit: PRODUCT_PAGE_SIZE,
      offset: pageParam,
      ...(categoryId ? { categoryId } : {}),
      ...(filters.featured ? { featured: "true" } : {}),
      ...(filters.condition !== "all" ? { condition: filters.condition } : {}),
      ...(filters.sort !== "newest" ? { sort: filters.sort } : {}),
      ...(filters.minPrice > 0 ? { minPrice: filters.minPrice } : {}),
      ...(filters.maxPrice < 2000000 ? { maxPrice: filters.maxPrice } : {}),
    },
  });

  return data;
};

const fetchTrendingKeywords = async (limit: number) => {
  const { data } = await axiosInstance.get<string[]>(
    "/products/trending-keywords",
    {
      params: { limit },
    },
  );

  return Array.isArray(data) && data.length ? data : fallbackTrendingSearches;
};

const fetchSearchSuggestions = async (query: string) => {
  const { data } = await axiosInstance.get<string[]>(
    "/products/search/suggestions",
    {
      params: { q: query },
    },
  );

  return Array.isArray(data) ? data : [];
};

const storeSearchEvent = async (query: string) => {
  await axiosInstance.post("/products/search-events", {
    query,
    source: "product-search",
  });
};

export function useProductDetailsQuery(productId: number) {
  return useQuery({
    queryKey: productKeys.detail(productId),
    queryFn: () => fetchProductDetails(productId),
    enabled: productId > 0,
    staleTime: 5 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useCurrentProductOrderQuery(productId: number, enabled = true) {
  return useQuery({
    queryKey: productKeys.currentOrder(productId),
    queryFn: () => fetchCurrentOrder(productId),
    enabled: enabled && productId > 0,
    staleTime: 30 * 1000,
    retry: false,
  });
}

export function useHomeProductSectionsQuery() {
  return useQuery({
    queryKey: productKeys.home(),
    queryFn: fetchHomeProducts,
    staleTime: 5 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    select: buildHomeSections,
  });
}

export function useProductSearchQuery(params: ProductSearchParams) {
  return useInfiniteQuery({
    queryKey: productKeys.search(params),
    queryFn: ({ pageParam = 0 }) =>
      fetchProductSearchPage({
        pageParam,
        query: params.query,
        categoryId: params.categoryId,
        filters: params.filters,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === PRODUCT_PAGE_SIZE
        ? allPages.flat().length
        : undefined,
    staleTime: 5 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useTrendingKeywordsQuery(limit = 8) {
  return useQuery({
    queryKey: productKeys.trendingKeywords(limit),
    queryFn: () => fetchTrendingKeywords(limit),
    staleTime: 5 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: false,
    placeholderData: fallbackTrendingSearches,
  });
}

export function useProductSearchSuggestionsQuery(
  query: string,
  enabled = true,
) {
  return useQuery({
    queryKey: productKeys.suggestions(query),
    queryFn: () => fetchSearchSuggestions(query),
    enabled: enabled && query.trim().length > 0,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useRecentProductSearchesQuery() {
  return useQuery({
    queryKey: productKeys.recentSearches(),
    queryFn: loadRecentSearches,
    staleTime: Infinity,
    gcTime: Infinity,
    initialData: [],
  });
}

export function useTrackProductSearchMutation() {
  return useMutation({
    mutationFn: storeSearchEvent,
  });
}

export function useRecentProductSearches() {
  const queryClient = useQueryClient();
  const query = useRecentProductSearchesQuery();
  const updateRecentSearches = useMutation({
    mutationFn: async (searches: string[]) => {
      await saveRecentSearches(searches);
      return searches;
    },
    onSuccess: (searches) => {
      queryClient.setQueryData(productKeys.recentSearches(), searches);
    },
  });

  const setRecentSearches = async (searches: string[]) => {
    await updateRecentSearches.mutateAsync(searches);
  };

  const addRecentSearch = async (searchTerm: string) => {
    const trimmedSearchTerm = searchTerm.trim();
    if (!trimmedSearchTerm) return;

    const currentSearches =
      queryClient.getQueryData<string[]>(productKeys.recentSearches()) ??
      query.data ??
      [];

    const nextSearches = [
      trimmedSearchTerm,
      ...currentSearches.filter(
        (item) => item.toLowerCase() !== trimmedSearchTerm.toLowerCase(),
      ),
    ].slice(0, 8);

    queryClient.setQueryData(productKeys.recentSearches(), nextSearches);
    await updateRecentSearches.mutateAsync(nextSearches);
  };

  const clearRecentSearches = async (index?: number) => {
    const currentSearches =
      queryClient.getQueryData<string[]>(productKeys.recentSearches()) ??
      query.data ??
      [];
    const nextSearches = [...currentSearches];

    if (index !== undefined) {
      nextSearches.splice(index, 1);
    } else {
      nextSearches.length = 0;
    }

    queryClient.setQueryData(productKeys.recentSearches(), nextSearches);
    await updateRecentSearches.mutateAsync(nextSearches);
  };

  return {
    ...query,
    recentSearches: query.data ?? [],
    setRecentSearches,
    addRecentSearch,
    clearRecentSearches,
    isSaving: updateRecentSearches.isPending,
  };
}

export const flattenProductSearchPages = (
  data: InfiniteData<ApiProduct[], unknown> | undefined,
) => {
  if (!data) return [];

  return data.pages.flatMap((page) => page.map(mapProductToCard));
};
