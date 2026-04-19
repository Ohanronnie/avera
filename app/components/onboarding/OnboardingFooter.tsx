import { Ionicons } from "@expo/vector-icons";
import { Pressable, View } from "react-native";

import { Text } from "@/components/ui/text";

type OnboardingFooterProps = {
  accent: string;
  currentStep: number;
  totalSteps: number;
  isLastStep: boolean;
  onNext: () => void;
};

export function OnboardingFooter({
  accent,
  currentStep,
  totalSteps,
  isLastStep,
  onNext,
}: OnboardingFooterProps) {
  return (
    <View className="pb-6 mt-4">
      <View className="mb-6 flex-row items-center justify-center gap-2">
        {Array.from({ length: totalSteps }).map((_, index) => {
          const active = index === currentStep;

          return (
            <View
              key={index}
              className={`rounded-full ${active ? "h-2.5 w-7" : "h-2.5 w-2.5 bg-white/15"}`}
              style={active ? { backgroundColor: accent } : undefined}
            />
          );
        })}
      </View>

      <Pressable
        onPress={onNext}
        className="h-14 mt-4 w-full flex-row items-center justify-center rounded-2xl"
        style={{ backgroundColor: accent }}
      >
        <Text className="text-base font-bold text-white">
          {isLastStep ? "Create account" : "Next"}
        </Text>
        <Ionicons
          name={isLastStep ? "arrow-forward" : "chevron-forward"}
          size={18}
          color="#FFFFFF"
          style={{ marginLeft: 6 }}
        />
      </Pressable>
    </View>
  );
}
