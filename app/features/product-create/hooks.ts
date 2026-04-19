import { productSchema } from "@/components/products/create-product/schema";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  createProduct,
  fetchCategories,
  uploadProductImages,
} from "@/features/product-create/api";
import { CreateProductForm } from "@/features/product-create/types";

export function useCategoriesQuery() {
  return useQuery({
    queryKey: ["product-categories"],
    queryFn: fetchCategories,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateProductMutation() {
  return useMutation({
    mutationFn: async (form: CreateProductForm) => {
      const parsed = productSchema.parse({
        ...form,
        description: form.description.trim(),
      });

      const uploadedImagePaths = await uploadProductImages(parsed.images);

      return createProduct({
        ...parsed,
        images: uploadedImagePaths,
      });
    },
  });
}
