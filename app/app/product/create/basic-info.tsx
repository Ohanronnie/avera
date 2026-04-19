import { CustomSelect } from "@/components/custom-select";
import { FormInput } from "@/components/products/create-product/form-input";
import { StepIndicator } from "@/components/products/create-product/step-indicator";
import { Text } from "@/components/themed/theme";
import { Navbar } from "@/components/navbar";
import { router } from "expo-router";
import { Pressable, ScrollView, View, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCreateProductFlow } from "@/features/product-create/context";
import { CREATE_PRODUCT_STEP_FIELDS, NIGERIAN_STATES } from "@/features/product-create/types";
import { useState } from "react";

const stepConfig = [
  { id: 1, key: "basic-info" },
  { id: 2, key: "pricing" },
  { id: 3, key: "media" },
  { id: 4, key: "review" },
] as const;

export default function BasicInfoScreen() {
  const { form, updateForm, errors, validateFields } = useCreateProductFlow();
  const [isSelectOpen, setIsSelectOpen] = useState(false);

  const stateOptions = NIGERIAN_STATES.map((state) => ({
    label: state,
    value: state,
  }));

  const goNext = () => {
    const isValid = validateFields(CREATE_PRODUCT_STEP_FIELDS["basic-info"]);
    if (!isValid) return;
    router.push("/product/create/pricing");
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#0A0A0A]" edges={["top", "bottom"]}>
      <Navbar title="Create Product" />
      <StepIndicator
        steps={[
          { id: 1, label: "Basic Info" },
          { id: 2, label: "Pricing" },
          { id: 3, label: "Media" },
          { id: 4, label: "Review" },
        ]}
        currentStep={1}
      />
      
      <ScrollView 
        className="flex-1 px-5 bg-white dark:bg-[#0A0A0A]"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: isSelectOpen ? 300 : 40 }}
      >
        <View className="py-6">
          <Text className="text-2xl font-bold text-black dark:text-white">Product Details</Text>
          <Text className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Fill in the essential information to help buyers find your item.
          </Text>
        </View>

        <FormInput
          label="Product Name"
          hint="Max 100 characters"
          value={form.name}
          onChange={(text) => updateForm({ name: text })}
          placeholder="What are you selling?"
          error={errors.name}
        />

        <FormInput
          label="Short Description"
          hint="A brief summary (max 60 chars)"
          value={form.shortDescription}
          onChange={(text) => updateForm({ shortDescription: text })}
          placeholder="Enter a catchy summary"
          multiline
          numberOfLines={2}
          error={errors.shortDescription}
        />

        <FormInput
          label="Detailed Description"
          hint="Full product details"
          value={form.description}
          onChange={(text) => updateForm({ description: text })}
          placeholder="Describe your product's features, condition, etc."
          multiline
          numberOfLines={6}
          error={errors.description}
        />

        <View className="mt-2 mb-8">
          <View className="flex-row items-center mb-1.5 px-1">
            <Text className="text-sm font-semibold text-gray-700 dark:text-gray-400 capitalize tracking-tight">
              Location
            </Text>
          </View>
          <CustomSelect
            options={stateOptions}
            selectedValue={form.location}
            onValueChange={(location) => updateForm({ location })}
            onToggle={setIsSelectOpen}
            placeholder="Where is the product located?"
            className="mb-1"
            searchPlaceholder="Search state"
            dropdownMaxHeight={320}
            searchable
          />
          {errors.location && (
            <Text className="text-red-500 text-xs font-medium mt-1.5 px-1">
              {errors.location}
            </Text>
          )}
        </View>
      </ScrollView>

      {/* Fixed Bottom Button */}
      <View className="px-5 py-4 border-t border-gray-100 dark:border-white/5 bg-white dark:bg-[#0A0A0A]">
        <TouchableOpacity
          activeOpacity={0.8}
          className="bg-brand h-14 justify-center rounded-2xl flex-row items-center"
          onPress={goNext}
        >
          <Text className="text-white font-bold text-base mr-2">Continue to Pricing</Text>
          <Ionicons name="arrow-forward" size={18} color="white" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
