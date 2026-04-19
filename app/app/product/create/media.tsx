import { CustomSelect } from "@/components/custom-select";
import { ImagePickerComponent } from "@/components/products/create-product/image-picker";
import { StepIndicator } from "@/components/products/create-product/step-indicator";
import { Text } from "@/components/themed/theme";
import { Navbar } from "@/components/navbar";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { ScrollView, View, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCreateProductFlow } from "@/features/product-create/context";
import { useCategoriesQuery } from "@/features/product-create/hooks";
import { CREATE_PRODUCT_STEP_FIELDS } from "@/features/product-create/types";

const stepConfig = [
  { id: 1, label: "Basic Info" },
  { id: 2, label: "Pricing" },
  { id: 3, label: "Media" },
  { id: 4, label: "Review" },
];

export default function MediaScreen() {
  const { form, updateForm, errors, validateFields } = useCreateProductFlow();
  const { data: categories = [], isLoading } = useCategoriesQuery();

  const categoryOptions = categories.map((category) => ({
    label: category.name,
    value: String(category.id),
  }));

  const handlePickImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: Math.max(0, 7 - form.images.length),
    });

    if (!result.canceled) {
      updateForm({
        images: [...form.images, ...result.assets.map((asset) => asset.uri)],
      });
    }
  };

  const handleRemoveImage = (index: number) => {
    const updatedImages = [...form.images];
    updatedImages.splice(index, 1);
    updateForm({ images: updatedImages });
  };

  const handleCategoryChange = (value: string) => {
    const selected = categories.find(
      (category) => String(category.id) === value,
    );
    if (!selected) return;
    updateForm({ categoryId: selected.id, categoryName: selected.name });
  };

  const goNext = () => {
    const isValid = validateFields(CREATE_PRODUCT_STEP_FIELDS.media);
    if (!isValid) return;
    router.push("/product/create/review");
  };

  return (
    <SafeAreaView
      className="flex-1 bg-white dark:bg-[#0A0A0A]"
      edges={["top", "bottom"]}
    >
      <Navbar title="Create Product" />
      <StepIndicator steps={stepConfig} currentStep={3} />

      <ScrollView
        className="flex-1 px-5 bg-white dark:bg-[#0A0A0A]"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 300 }}
      >
        <View className="py-6">
          <Text className="text-2xl font-bold text-black dark:text-white">
            Category & Photos
          </Text>
          <Text className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Visuals are key! Add high-quality photos of your product.
          </Text>
        </View>

        <View className="mb-8">
          <View className="flex-row items-center mb-1.5 px-1">
            <Text className="text-sm font-semibold text-gray-700 dark:text-gray-400 capitalize tracking-tight">
              Product Category
            </Text>
          </View>
          <CustomSelect
            options={categoryOptions}
            selectedValue={
              form.categoryId ? String(form.categoryId) : undefined
            }
            onValueChange={handleCategoryChange}
            placeholder={
              isLoading ? "Loading categories..." : "Select category"
            }
            searchable
            searchPlaceholder="Search category"
            triggerClassName="h-14 rounded-2xl bg-gray-50/50 dark:bg-white/5 border-gray-100 dark:border-white/10"
            disabled={isLoading}
            dropdownMaxHeight={280}
          />
          {errors.categoryId && (
            <Text className="text-red-500 text-xs font-medium mt-1.5 px-1">
              {errors.categoryId}
            </Text>
          )}
        </View>

        <ImagePickerComponent
          images={form.images}
          onAddImages={handlePickImages}
          onRemoveImage={handleRemoveImage}
          error={errors.images}
        />
      </ScrollView>

      {/* Sticky Bottom Footer */}
      <View className="px-5 py-4 border-t border-gray-100 dark:border-white/5 bg-white dark:bg-[#0A0A0A] flex-row gap-x-3">
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.back()}
          className="flex-1 h-14 justify-center rounded-2xl border border-gray-200 dark:border-white/10"
        >
          <Text className="text-black dark:text-white font-bold text-center">
            Back
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={goNext}
          className="flex-[2] bg-brand h-14 justify-center rounded-2xl flex-row items-center"
        >
          <Text className="text-white font-bold text-base mr-2">
            Review Product
          </Text>
          <Ionicons name="arrow-forward" size={18} color="white" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
