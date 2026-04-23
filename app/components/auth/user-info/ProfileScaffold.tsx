import { Ionicons } from "@expo/vector-icons";
import { Pressable, View } from "react-native";

import { AveraLoader } from "@/components/brand/AveraLoader";
import { Button, ButtonText } from "@/components/ui/button";
import { Text } from "@/components/ui/text";

import { PROFILE_STEPS } from "./constants";

interface BackButtonProps {
  isDark: boolean;
  onPress: () => void;
}

export function BackButton({ isDark, onPress }: BackButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      className="h-11 w-11 items-center justify-center rounded-2xl border border-gray-100 bg-gray-50 dark:border-white/5 dark:bg-white/5"
      style={({ pressed }) => [
        {
          transform: [{ scale: pressed ? 0.97 : 1 }],
          borderColor: pressed
            ? "#3b82f6"
            : isDark
              ? "rgba(255,255,255,0.08)"
              : "#E5E7EB",
        },
      ]}
    >
      <Ionicons
        name="chevron-back"
        size={24}
        color={isDark ? "white" : "#181718"}
      />
    </Pressable>
  );
}

interface StepHeaderProps {
  currentStep: number;
}

export function StepHeader({ currentStep }: StepHeaderProps) {
  const activeStep = PROFILE_STEPS[currentStep];

  return (
    <>
      <View className="mb-7 flex-row gap-x-2">
        {PROFILE_STEPS.map((step, index) => (
          <View
            key={step.title}
            className={`h-2 flex-1 rounded-full ${
              index <= currentStep ? "bg-brand" : "bg-gray-100 dark:bg-white/10"
            }`}
          />
        ))}
      </View>

      <View className="mb-5 max-w-[88%]">
        <Text className="mb-2 text-sm font-bold uppercase tracking-widest text-brand">
          Step {currentStep + 1} of {PROFILE_STEPS.length}
        </Text>
        <Text
          size="4xl"
          className="mb-2 font-bold text-gray-900 dark:text-white"
        >
          {activeStep.title}
        </Text>
        <Text className="mb-2 text-base text-gray-500 dark:text-gray-400">
          {activeStep.subtitle}
        </Text>
      </View>
    </>
  );
}

interface StepActionsProps {
  currentStep: number;
  disabled: boolean;
  loading: boolean;
  onBack: () => void;
  onNext: () => void;
}

export function StepActions({
  currentStep,
  disabled,
  loading,
  onBack,
  onNext,
}: StepActionsProps) {
  const isLastStep = currentStep === PROFILE_STEPS.length - 1;

  return (
    <View className="mt-auto pt-8">
      <Button
        size="xl"
        className="h-14 flex-row items-center justify-center rounded-full bg-brand"
        onPress={onNext}
        disabled={disabled}
      >
        {loading ? (
          <AveraLoader size={24} color="#FFFFFF" compact />
        ) : (
          <ButtonText className="font-bold text-typography-white">
            {isLastStep ? "Submit" : "Continue"}
          </ButtonText>
        )}
      </Button>

      {currentStep > 0 && (
        <Pressable onPress={onBack} className="mt-4 py-3">
          <Text className="text-center text-sm font-bold text-gray-500 dark:text-gray-400">
            Back
          </Text>
        </Pressable>
      )}
    </View>
  );
}
