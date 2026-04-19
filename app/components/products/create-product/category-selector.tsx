import { Text } from "@/components/themed/theme";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, View } from "react-native";

interface CategorySelectorProps {
  value: number;
  onSelect: (categoryId: number) => void;
  error?: string;
  onOpenModal: () => void;
  categoryName: string;
}

export function CategorySelector({
  value,
  onSelect,
  error,
  onOpenModal,
  categoryName,
}: CategorySelectorProps) {
  return (
    <View className="mb-4">
      <Text className="text-base font-medium mb-1 text-white">Category</Text>
      <Pressable
        onPress={onOpenModal}
        className="border border-gray-300 rounded-xl h-14 flex-row items-center justify-between px-3"
      >
        <Text className="text-white">{categoryName}</Text>
        <Ionicons name="chevron-down" size={20} color="gray" />
      </Pressable>
      {error && <Text className="text-red-500 text-sm mt-1">{error}</Text>}
    </View>
  );
}
