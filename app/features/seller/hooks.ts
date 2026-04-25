import {
  mapProductToCard,
  PaginatedProductsResponse,
} from "@/features/products/types";
import { axiosInstance } from "@/utils/axios";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

const SELLER_LISTINGS_PAGE_SIZE = 10;

export interface SellerDetails {
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

export const sellerKeys = {
  all: ["seller"] as const,
  details: (sellerId: string) => ["seller", "details", sellerId] as const,
  listings: (sellerId: string) => ["seller", "listings", sellerId] as const,
};

const fetchSellerDetails = async (sellerId: string) => {
  const { data } = await axiosInstance.get<SellerDetails>(`/users/${sellerId}`);
  return data;
};

const fetchSellerListings = async (sellerId: string, offset: number) => {
  const { data } = await axiosInstance.get<PaginatedProductsResponse>(
    `/users/${sellerId}/listings`,
    {
      params: {
        limit: SELLER_LISTINGS_PAGE_SIZE,
        offset,
      },
    },
  );

  return {
    ...data,
    mappedItems: data.items.map(mapProductToCard),
    nextOffset: offset + data.items.length,
  };
};

export function useSellerDetailsQuery(sellerId: string) {
  return useQuery({
    queryKey: sellerKeys.details(sellerId),
    queryFn: () => fetchSellerDetails(sellerId),
    enabled: Boolean(sellerId),
    staleTime: 5 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useSellerListingsQuery(sellerId: string) {
  return useInfiniteQuery({
    queryKey: sellerKeys.listings(sellerId),
    queryFn: ({ pageParam }) => fetchSellerListings(sellerId, pageParam),
    enabled: Boolean(sellerId),
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextOffset : undefined,
    staleTime: 5 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useInventoryListingsQuery(userId: string) {
  return useSellerListingsQuery(userId);
}
