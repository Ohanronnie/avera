import { Text } from "@/components/themed/theme";
import { FormInput } from "./form-input";
import { Pressable, View, Image, FlatList } from "react-native";
import { CreateProduct } from "./schema";
import { Ionicons } from "@expo/vector-icons";

interface TagsReviewProps {
  form: CreateProduct;
  onUpdateForm: (updates: Partial<CreateProduct>) => void;
  onSubmit: () => void;
  onOpenConditionModal: () => void;
  errors: Record<string, string>;
  disabled: boolean;
  selectedCondition: string;
}

export function TagsReview({
  errors,
  form,
  selectedCondition,
  onUpdateForm,
  onOpenConditionModal,
  onSubmit,
  disabled,
}: TagsReviewProps) {
  return (
    <View className="flex-1">
      {/* Section Header */}
      <Text className="text-xl font-semibold mb-4 text-white">
        Tags & Review
      </Text>

      {/* Tags input */}
      <FormInput
        label="Tags"
        value={form.tags?.join(", ") || ""}
        onChange={(text) =>
          onUpdateForm({
            tags: text.split(",").map((t) => t.trim()),
          })
        }
        placeholder="Comma separated tags"
      />

      {/* Visual Tags */}
      {form.tags && form.tags.length > 0 && (
        <View className="flex-row flex-wrap mt-2">
          {form.tags.map((tag, idx) => (
            <View
              key={idx}
              className="bg-gray-200 px-3 py-1 rounded-full mr-2 mb-2"
            >
              <Text className="text-sm text-gray-700">#{tag}</Text>
            </View>
          ))}
        </View>
      )}
      <View className="mb-4 mt-4">
        <Text className="text-base font-medium mb-1 text-white">Condition</Text>
        <Pressable
          onPress={onOpenConditionModal}
          className="border border-gray-300 rounded-xl h-14 flex-row items-center justify-between px-3"
        >
          <Text className="text-white">{selectedCondition}</Text>
          <Ionicons name="chevron-down" size={20} color="gray" />
        </Pressable>
        {errors.condition && (
          <Text className="text-red-500 text-sm mt-1">{errors.condition}</Text>
        )}
      </View>
      {/* Product Preview */}
      <View className="mt-6">
        <Text className="text-base font-semibold text-white mb-2">
          Product Preview
        </Text>

        {/* Images carousel */}
        <FlatList
          data={form.images}
          keyExtractor={(item, index) => index.toString()}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingVertical: 8 }}
          renderItem={({ item }) => (
            <Image
              source={{ uri: item }}
              className="w-40 h-40 mr-3 rounded-xl bg-gray-100"
            />
          )}
        />

        {/* Info */}
        <View className="mt-4">
          <Text className="text-lg font-semibold text-white">{form.name}</Text>
          <Text className="text-green-700 text-base font-medium">
            {form.currency} {form.price.toLocaleString()}
          </Text>
          <Text className="text-sm text-gray-500 mt-1">
            Quantity: {form.quantity} | Condition: {form.condition} | Category:{" "}
            {form.categoryName}
          </Text>
          <Text className="text-sm text-gray-700 mt-3">{form.description}</Text>
        </View>
      </View>

      {/* Submit */}
      <Pressable
        onPress={onSubmit}
        className="bg-brand py-3 h-14 flex-row justify-center rounded-2xl items-center mt-8"
        disabled={disabled}
      >
        <Text className="text-white font-semibold">Create Product</Text>
      </Pressable>
    </View>
  );
}
