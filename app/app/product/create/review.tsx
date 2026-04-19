import { CustomSelect } from "@/components/custom-select";
import { FormInput } from "@/components/products/create-product/form-input";
import { StepIndicator } from "@/components/products/create-product/step-indicator";
import { Text } from "@/components/themed/theme";
import { Navbar } from "@/components/navbar";
import { router } from "expo-router";
import { Image, ScrollView, View, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCreateProductFlow } from "@/features/product-create/context";
import { useCreateProductMutation } from "@/features/product-create/hooks";
import { CONDITION_OPTIONS } from "@/features/product-create/types";

const stepConfig = [
  { id: 1, label: "Basic Info" },
  { id: 2, label: "Pricing" },
  { id: 3, label: "Media" },
  { id: 4, label: "Review" },
];

export default function ReviewScreen() {
  const { form, updateForm, errors, validateAll, reset } = useCreateProductFlow();
  const createProductMutation = useCreateProductMutation();

  const conditionOptions = CONDITION_OPTIONS.map((condition) => ({
    label: condition,
    value: condition,
  }));

  const handleSubmit = async () => {
    if (!validateAll()) return;

    await createProductMutation.mutateAsync(form, {
      onSuccess: () => {
        reset();
        router.replace("/(tabs)/home");
      },
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#0A0A0A]" edges={["top", "bottom"]}>
      <Navbar title="Create Product" />
      <StepIndicator steps={stepConfig} currentStep={4} />
      
      <ScrollView 
        className="flex-1 px-5 bg-white dark:bg-[#0A0A0A]"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 300 }}
      >
        <View className="py-6">
          <Text className="text-2xl font-bold text-black dark:text-white">Final Review</Text>
          <Text className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Check everything one last time before going live.
          </Text>
        </View>

        <View className="mb-8">
          <View className="flex-row items-center mb-1.5 px-1">
            <Text className="text-sm font-semibold text-gray-700 dark:text-gray-400 capitalize tracking-tight">
              Condition
            </Text>
          </View>
          <CustomSelect
            options={conditionOptions}
            selectedValue={form.condition}
            onValueChange={(condition) =>
              updateForm({ condition: condition as (typeof CONDITION_OPTIONS)[number] })
            }
            placeholder="Select condition"
            triggerClassName="h-14 rounded-2xl bg-gray-50/50 dark:bg-white/5 border-gray-100 dark:border-white/10"
          />
          {errors.condition && (
            <Text className="text-red-500 text-xs font-medium mt-1.5 px-1">
              {errors.condition}
            </Text>
          )}
        </View>

        <FormInput
          label="Search Tags"
          hint="Separate with commas"
          value={form.tags?.join(", ") || ""}
          onChange={(text) =>
            updateForm({
              tags: text
                .split(",")
                .map((tag) => tag.trim())
                .filter(Boolean),
            })
          }
          placeholder="e.g. apple, iphone, phone"
        />

        <View className="mt-2 bg-gray-50/50 dark:bg-white/5 rounded-3xl p-5 border border-gray-100 dark:border-white/10">
          <Text className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-widest mb-4">
            Listing Summary
          </Text>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-2 mb-4">
            {form.images.map((uri, index) => (
              <Image
                key={`${uri}-${index}`}
                source={{ uri }}
                className="w-24 h-24 mx-2 rounded-2xl bg-gray-200 dark:bg-white/10 border border-gray-100 dark:border-white/10"
              />
            ))}
          </ScrollView>

          <View className="space-y-3">
            <View className="flex-row justify-between mb-1">
              <Text className="text-gray-500 dark:text-gray-400 text-sm">Product Name</Text>
              <Text className="text-black dark:text-white font-bold text-sm text-right flex-1 ml-4">{form.name}</Text>
            </View>
            <View className="flex-row justify-between mb-1">
              <Text className="text-gray-500 dark:text-gray-400 text-sm">Price</Text>
              <Text className="text-brand font-bold text-sm">{form.currency} {form.price.toLocaleString()}</Text>
            </View>
            <View className="flex-row justify-between mb-1">
              <Text className="text-gray-500 dark:text-gray-400 text-sm">Category</Text>
              <Text className="text-black dark:text-white font-semibold text-sm">{form.categoryName}</Text>
            </View>
            <View className="flex-row justify-between mb-1">
              <Text className="text-gray-500 dark:text-gray-400 text-sm">Quantity</Text>
              <Text className="text-black dark:text-white font-semibold text-sm">{form.quantity}</Text>
            </View>
          </View>

          <View className="mt-4 pt-4 border-t border-gray-100 dark:border-white/10">
            <Text className="text-gray-500 dark:text-gray-400 text-xs leading-5">
              {form.description}
            </Text>
          </View>
        </View>

        {createProductMutation.isError && (
          <View className="mt-4 p-4 bg-red-50 dark:bg-red-500/10 rounded-2xl border border-red-100 dark:border-red-500/20">
            <Text className="text-red-500 text-xs font-medium text-center">
              Could not create product. Please check your connection and try again.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Sticky Bottom Footer */}
      <View className="px-5 py-4 border-t border-gray-100 dark:border-white/5 bg-white dark:bg-[#0A0A0A] flex-row gap-x-3">
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.back()}
          className="flex-1 h-14 justify-center rounded-2xl border border-gray-200 dark:border-white/10"
        >
          <Text className="text-black dark:text-white font-bold text-center">Back</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleSubmit}
          disabled={createProductMutation.isPending}
          className="flex-[2] bg-brand h-14 justify-center rounded-2xl flex-row items-center"
        >
          <Text className="text-white font-bold text-base mr-2">
            {createProductMutation.isPending ? "Creating..." : "Complete Listing"}
          </Text>
          <Ionicons name="checkmark" size={18} color="white" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}