import { IProduct } from "@/components/products/product-card";

export type ProductImage = {
  id: number;
  url: string;
  productId?: number;
};

export type ProductSeller = {
  id: number;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
};

export type ProductCategory = {
  id: number;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  iconName?: string | null;
};

export type ApiProduct = {
  id: number;
  name: string;
  description?: string;
  price: number | string;
  condition?: string | null;
  quantity?: number;
  currency?: string;
  location?: string | null;
  rating?: number;
  numReviews?: number;
  isFeatured?: boolean;
  images?: ProductImage[];
  seller?: ProductSeller | null;
  category?: ProductCategory | null;
};

export type PaginatedProductsResponse = {
  items: ApiProduct[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
};

export const mapProductToCard = (item: ApiProduct): IProduct => {
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
    condition: item.condition || "",
    location: item.location || "Nigeria",
    imageUrl: item.images?.[0]?.url,
  };
};
