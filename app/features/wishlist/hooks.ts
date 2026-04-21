import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { axiosInstance } from "@/utils/axios";
import { ApiProduct } from "@/features/products/types";

export const wishlistKeys = {
  all: ["wishlist"] as const,
  ids: ["wishlist", "ids"] as const,
  products: ["wishlist", "products"] as const,
};

type ToggleWishlistInput = {
  productId: number;
  isWishlisted: boolean;
};

export const useWishlistProductIds = () => {
  return useQuery({
    queryKey: wishlistKeys.ids,
    queryFn: async () => {
      const { data } = await axiosInstance.get<number[]>("/wishlist/ids");
      return data;
    },
    retry: false,
  });
};

export const useWishlistProducts = () => {
  return useQuery({
    queryKey: wishlistKeys.products,
    queryFn: async () => {
      const { data } = await axiosInstance.get<ApiProduct[]>("/wishlist");
      return data;
    },
    retry: false,
  });
};

export const useToggleWishlistMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ productId, isWishlisted }: ToggleWishlistInput) => {
      if (isWishlisted) {
        const { data } = await axiosInstance.delete(`/wishlist/${productId}`);
        return data;
      }

      const { data } = await axiosInstance.post(`/wishlist/${productId}`);
      return data;
    },
    onMutate: async ({ productId, isWishlisted }) => {
      await queryClient.cancelQueries({ queryKey: wishlistKeys.ids });
      await queryClient.cancelQueries({ queryKey: wishlistKeys.products });

      const previousIds = queryClient.getQueryData<number[]>(wishlistKeys.ids);
      const previousProducts = queryClient.getQueryData<ApiProduct[]>(
        wishlistKeys.products,
      );

      queryClient.setQueryData<number[]>(wishlistKeys.ids, (current = []) => {
        if (isWishlisted) {
          return current.filter((id) => id !== productId);
        }

        return current.includes(productId) ? current : [...current, productId];
      });

      if (isWishlisted) {
        queryClient.setQueryData<ApiProduct[]>(
          wishlistKeys.products,
          (current = []) => current.filter((product) => product.id !== productId),
        );
      }

      return { previousIds, previousProducts };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousIds) {
        queryClient.setQueryData(wishlistKeys.ids, context.previousIds);
      }

      if (context?.previousProducts) {
        queryClient.setQueryData(wishlistKeys.products, context.previousProducts);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: wishlistKeys.ids });
      queryClient.invalidateQueries({ queryKey: wishlistKeys.products });
    },
  });
};
