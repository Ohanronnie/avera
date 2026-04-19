import { CustomSelect } from "@/components/custom-select";
import { FormInput } from "@/components/products/create-product/form-input";
import { StepIndicator } from "@/components/products/create-product/step-indicator";
import { Text } from "@/components/themed/theme";
import { Navbar } from "@/components/navbar";
import { router } from "expo-router";
import { ScrollView, View, TouchableOpacity, Switch } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCreateProductFlow } from "@/features/product-create/context";
import {
  CREATE_PRODUCT_STEP_FIELDS,
  CURRENCY_OPTIONS,
} from "@/features/product-create/types";

const stepConfig = [
  { id: 1, label: "Basic Info" },
  { id: 2, label: "Pricing" },
  { id: 3, label: "Media" },
  { id: 4, label: "Review" },
];

export default function PricingScreen() {
  const { form, updateForm, errors, validateFields } = useCreateProductFlow();

  const currencyOptions = CURRENCY_OPTIONS.map((currency) => ({
    label: currency,
    value: currency,
  }));

  const goNext = () => {
    const isValid = validateFields(CREATE_PRODUCT_STEP_FIELDS.pricing);
    if (!isValid) return;
    router.push("/product/create/media");
  };

  return (
    <SafeAreaView
      className="flex-1 bg-white dark:bg-[#0A0A0A]"
      edges={["top", "bottom"]}
    >
      <Navbar title="Create Product" />
      <StepIndicator steps={stepConfig} currentStep={2} />

      <ScrollView
        className="flex-1 px-5 bg-white dark:bg-[#0A0A0A]"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 300 }}
      >
        <View className="py-6">
          <Text className="text-2xl font-bold text-black dark:text-white">
            Pricing & Inventory
          </Text>
          <Text className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Define your price and how many items you have available.
          </Text>
        </View>

        <FormInput
          label="Price"
          hint={`Currency: ${form.currency}`}
          value={form.price ? String(form.price) : ""}
          onChange={(text) => updateForm({ price: Number(text) || 0 })}
          placeholder="0.00"
          keyboardType="numeric"
          error={errors.price}
        />

        <View className="mb-8">
          <View className="flex-row items-center mb-1.5 px-1">
            <Text className="text-sm font-semibold text-gray-700 dark:text-gray-400 capitalize tracking-tight">
              Currency
            </Text>
          </View>
          <CustomSelect
            options={currencyOptions}
            selectedValue={form.currency}
            onValueChange={(currency) =>
              updateForm({ currency: currency as "NGN" })
            }
            placeholder="Select currency"
          />
          {errors.currency && (
            <Text className="text-red-500 text-xs font-medium mt-1.5 px-1">
              {errors.currency}
            </Text>
          )}
        </View>

        <FormInput
          label="Available Quantity"
          hint="How many do you have?"
          value={String(form.quantity)}
          onChange={(text) => updateForm({ quantity: parseInt(text, 10) || 1 })}
          placeholder="1"
          keyboardType="numeric"
          error={errors.quantity}
        />

        <View
          className={`p-4 rounded-2xl border flex-row justify-between items-center ${form.isNegotiable ? "border-brand bg-brand/5 dark:bg-brand/10" : "border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-[#1A1A1A]"}`}
        >
          <View className="flex-1 pr-4">
            <Text className="text-sm font-bold text-gray-900 dark:text-white">
              Negotiable
            </Text>
            <Text className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Allow buyers to make price offers
            </Text>
          </View>
          <Switch
            value={form.isNegotiable}
            onValueChange={(val) => updateForm({ isNegotiable: val })}
            trackColor={{ false: "#333", true: "#2563EB" }}
            thumbColor={"#FFFFFF"}
          />
        </View>
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
            Continue to Media
          </Text>
          <Ionicons name="arrow-forward" size={18} color="white" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
