import { Text } from "@/components/themed/theme";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, View } from "react-native";

interface CurrencySelectorProps {
  value: string;
  onSelect: (currency: string) => void;
  error?: string;
  onOpenModal: () => void;
}

export function CurrencySelector({
  value,
  onSelect,
  error,
  onOpenModal,
}: CurrencySelectorProps) {
  return (
    <View className="mb-4">
      <Text className="text-base font-medium mb-1 text-white">Currency</Text>
      <Pressable
        onPress={onOpenModal}
        className="border border-gray-300 rounded-2xl h-14 flex-row items-center justify-between px-3"
      >
        <Text className="text-white">{value}</Text>
        <Ionicons name="chevron-down" size={20} color="gray" />
      </Pressable>
      {error && <Text className="text-red-500 text-sm mt-1">{error}</Text>}
    </View>
  );
}
