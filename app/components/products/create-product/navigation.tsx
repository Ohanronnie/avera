import { Text } from "@/components/themed/theme";
import { Pressable, View } from "react-native";

export interface NavigationButtonsProps {
  step: number;
  totalSteps: number;
  onPrevious: () => void;
  onNext: () => void;
  onValidate: () => boolean;
  disabled: boolean;
}

export function NavigationButtons({
  step,
  totalSteps,
  onPrevious,
  onNext,
  onValidate,
  disabled,
}: NavigationButtonsProps) {
  return (
    <View className="justify-between flex-row items-center">
      {step > 1 && (
        <Pressable
          onPress={onPrevious}
          className="bg-gray-200 flex-1 mr-2 h-14 justify-center py-3 rounded-2xl items-center mt-6"
        >
          <Text className="text-white font-semibold">Previous</Text>
        </Pressable>
      )}
      {step < totalSteps && (
        <Pressable
          onPress={() => {
            if (onValidate()) onNext();
          }}
          className="bg-brand h-14 flex-1 justify-center py-3 rounded-2xl items-center mt-6"
        >
          <Text className="text-white font-semibold">Next</Text>
        </Pressable>
      )}
    </View>
  );
}
