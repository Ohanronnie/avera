import { productSchema } from "@/components/products/create-product/schema";
import z from "zod";

export type CreateProductForm = z.infer<typeof productSchema>;

export type CreateProductField = keyof CreateProductForm;

export interface Category {
  id: number;
  name: string;
}

export const DEFAULT_CREATE_PRODUCT_FORM: CreateProductForm = {
  name: "",
  shortDescription: "",
  description: "",
  price: 0,
  categoryId: 0,
  categoryName: "",
  images: [],
  quantity: 1,
  condition: "New",
  tags: [],
  currency: "NGN",
  location: "Lagos",
  isNegotiable: false,
};

export const NIGERIAN_STATES: string[] = [
  "Abia",
  "Adamawa",
  "Akwa Ibom",
  "Anambra",
  "Bauchi",
  "Bayelsa",
  "Benue",
  "Borno",
  "Cross River",
  "Delta",
  "Ebonyi",
  "Edo",
  "Ekiti",
  "Enugu",
  "Abuja",
  "Gombe",
  "Imo",
  "Jigawa",
  "Kaduna",
  "Kano",
  "Katsina",
  "Kebbi",
  "Kogi",
  "Kwara",
  "Lagos",
  "Nasarawa",
  "Niger",
  "Ogun",
  "Ondo",
  "Osun",
  "Oyo",
  "Plateau",
  "Rivers",
  "Sokoto",
  "Taraba",
  "Yobe",
  "Zamfara",
];

export const CONDITION_OPTIONS: Array<CreateProductForm["condition"]> = [
  "New",
  "Foreign Used",
  "Local Used",
];

export const CURRENCY_OPTIONS: Array<CreateProductForm["currency"]> = ["NGN"];

export const CREATE_PRODUCT_STEP_FIELDS: Record<string, CreateProductField[]> = {
  "basic-info": ["name", "shortDescription", "description", "location"],
  pricing: ["price", "quantity", "currency", "isNegotiable"],
  media: ["categoryId", "categoryName", "images"],
  review: ["condition"],
};
