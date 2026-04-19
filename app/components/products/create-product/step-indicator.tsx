import { View } from "react-native";
import { Text } from "@/components/themed/theme";
import { Ionicons } from "@expo/vector-icons";

export interface StepIndicatorProps {
  steps: Array<{ id: number; label: string }>;
  currentStep: number;
}

export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <View className="flex-row items-start px-4 mt-4 mb-6">
      {steps.map((s, index) => {
        const isCompleted = currentStep > s.id;
        const isActive = currentStep === s.id;

        return (
          <View key={s.id} className="flex-1 items-center relative">
            {/* Connector Line */}
            {index !== 0 && (
              <View
                className={`absolute h-[2px] top-4 -translate-y-1/2 left-[-50%] right-[50%] ${
                  currentStep >= s.id
                    ? "bg-brand"
                    : "bg-gray-200 dark:bg-white/10"
                }`}
              />
            )}

            {/* Circle */}
            <View
              className={`w-8 h-8 rounded-full items-center justify-center z-10 ${
                isCompleted || isActive
                  ? "bg-brand"
                  : "bg-white dark:bg-[#0A0A0A] border-2 border-gray-200 dark:border-white/10"
              }`}
            >
              {isCompleted ? (
                <Ionicons name="checkmark" size={18} color="white" />
              ) : (
                <Text
                  className={`text-sm font-semibold ${
                    isActive ? "text-white" : "text-gray-400 dark:text-gray-500"
                  }`}
                >
                  {s.id}
                </Text>
              )}
            </View>

            {/* Label */}
            <Text
              className={`mt-2 text-[10px] font-semibold text-center ${
                isCompleted
                  ? "text-brand"
                  : isActive
                    ? "text-gray-500 dark:text-gray-400"
                    : "text-gray-300 dark:text-gray-700"
              }`}
            >
              {s.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
