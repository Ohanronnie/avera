import { axiosInstance } from "@/utils/axios";
import { CreateProductForm, Category } from "@/features/product-create/types";

interface UploadImagesResponse {
  files: Array<{ path: string }>;
}

interface CreateProductResponse {
  id?: number;
  message?: string;
}

export async function fetchCategories(): Promise<Category[]> {
  const response = await axiosInstance.get<Category[]>("/categories");
  return response.data;
}

export async function uploadProductImages(images: string[]): Promise<string[]> {
  const formData = new FormData();

  images.forEach((uri, index) => {
    formData.append("images", {
      uri,
      name: `${index}-${uri.split("/").pop() ?? "image.jpg"}`,
      type: "image/jpeg",
    } as unknown as Blob);
  });

  const response = await axiosInstance.post<UploadImagesResponse>(
    "/uploads/images",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return response.data.files.map((file) => file.path);
}

export async function createProduct(
  payload: CreateProductForm
): Promise<CreateProductResponse> {
  const response = await axiosInstance.post<CreateProductResponse>(
    "/products/create",
    payload
  );
  return response.data;
}
