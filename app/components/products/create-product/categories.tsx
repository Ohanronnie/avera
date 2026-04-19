import { Text } from "@/components/themed/theme";
import { CategorySelector } from "./category-selector";
import { ImagePickerComponent } from "./image-picker";
import { CreateProduct } from "./schema";

interface CategoryImagesProps {
  form: CreateProduct;
  onUpdateForm: (updates: Partial<CreateProduct>) => void;
  errors: Record<string, string>;
  onOpenCategoryModal: () => void;
  onPickImages: () => Promise<void>;
}
export function CategoryImages({
  form,
  onUpdateForm,
  errors,
  onOpenCategoryModal,
  onPickImages,
}: CategoryImagesProps) {
  return (
    <>
      <Text className="text-xl font-semibold mb-2 text-white">
        Category & Images
      </Text>
      <CategorySelector
        value={form.categoryId}
        onSelect={(categoryId) => onUpdateForm({ categoryId })}
        error={errors.categoryId}
        onOpenModal={onOpenCategoryModal}
        categoryName={form.categoryName}
      />
      <ImagePickerComponent
        images={form.images}
        onAddImages={onPickImages}
        error={errors.images}
      />
    </>
  );
}
