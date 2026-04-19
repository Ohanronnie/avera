import z from "zod";

// 🔹 Zod schema
export const productSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),

  shortDescription: z.string().min(5, "Short description must be at least 5 characters").max(60, "Short description must be at most 60 characters"),
  description: z.string().min(10, "Long description must be at least 10 characters"),
  price: z.number().positive("Price must be greater than 0"),
  categoryName: z.string().min(3, "Category name must be at least 3 characters"),
  categoryId: z.number().positive("Category is required"),
  images: z
    .array(z.url("Invalid image URL"))
    .min(1, "At least 1 image required")
    .max(7, "Maximum 7 images allowed"),
  quantity: z.number().int().positive("Quantity must be at least 1"),
  condition: z.enum(["New", "Foreign Used", "Local Used"]),
  tags: z.array(z.string()).optional(),
  currency: z.enum([/*"USD", "EUR",*/ "NGN" /*, "GBP"*/]),
  location: z.string().min(3),
  isNegotiable: z.boolean().default(false),
});

export interface CreateProduct extends z.infer<typeof productSchema> {}
