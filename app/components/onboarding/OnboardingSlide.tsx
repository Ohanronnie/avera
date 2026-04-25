import { Image, View } from "react-native";

import type { OnboardingSlide as OnboardingSlideType } from "@/components/onboarding/data";
import { Text } from "@/components/ui/text";

type OnboardingSlideProps = {
  slide: OnboardingSlideType;
};

export function OnboardingSlide({ slide }: OnboardingSlideProps) {
  return (
    <View className="flex-1 pt-6">
      <Image
        source={slide.image}
        className="flex-1 w-full rounded-2xl"
        resizeMode="cover"
      />

      <View className="mt-8">
        <Text
          className="text-sm font-extrabold uppercase tracking-widest"
          style={{ color: slide.accent }}
        >
          {slide.eyebrow}
        </Text>
        <Text className="mt-2 text-xl font-extrabold tracking-tight text-gray-950 dark:text-white">
          {slide.title}
        </Text>
        <Text className="mt-3 text-lg leading-7 text-gray-500 dark:text-gray-400">
          {slide.description}
        </Text>
      </View>
    </View>
  );
}
