import { router } from "expo-router";
import { useMemo, useState } from "react";
import { PanResponder, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { OnboardingFooter } from "@/components/onboarding/OnboardingFooter";
import { OnboardingHeader } from "@/components/onboarding/OnboardingHeader";
import { OnboardingSlide } from "@/components/onboarding/OnboardingSlide";
import { ONBOARDING_SLIDES } from "@/components/onboarding/data";

export default function OnboardingScreen() {
  const [currentStep, setCurrentStep] = useState(0);
  const isLastStep = currentStep === ONBOARDING_SLIDES.length - 1;
  const activeSlide = ONBOARDING_SLIDES[currentStep];

  const handleBack = () => {
    if (currentStep === 0) return;
    setCurrentStep((step) => step - 1);
  };

  const handleNext = () => {
    if (isLastStep) {
      router.push("/(auth)/register");
      return;
    }

    setCurrentStep((step) => step + 1);
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dx) > 24 &&
          Math.abs(gestureState.dy) < 18 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
        onPanResponderRelease: (_, gestureState) => {
          if (
            gestureState.dx <= -72 &&
            currentStep < ONBOARDING_SLIDES.length - 1
          ) {
            setCurrentStep((step) => step + 1);
          }

          if (gestureState.dx >= 72 && currentStep > 0) {
            setCurrentStep((step) => step - 1);
          }
        },
      }),
    [currentStep],
  );

  return (
    <SafeAreaView className="flex-1 bg-[#0A0A0A]">
      <View className="flex-1 bg-[#0A0A0A] px-4">
        <OnboardingHeader
          showBack={currentStep > 0}
          showSkip={!isLastStep}
          onBack={handleBack}
        />

        <View
          className="flex-1 flex-col justify-between"
          {...panResponder.panHandlers}
        >
          <OnboardingSlide slide={activeSlide} />

          <OnboardingFooter
            accent={activeSlide.accent}
            currentStep={currentStep}
            totalSteps={ONBOARDING_SLIDES.length}
            isLastStep={isLastStep}
            onNext={handleNext}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
