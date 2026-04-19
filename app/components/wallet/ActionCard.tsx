import { TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";

import { Text } from "@/components/themed/theme";

export function ActionCard({
  icon,
  label,
  onPress,
  iconPosition = "right",
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
  iconPosition?: "left" | "right";
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.82}
      onPress={onPress}
      className="h-16 flex-1 flex-row items-center justify-center rounded-2xl bg-[#1A1A1C]"
    >
      {iconPosition === "left" ? (
        <>
          <Feather name={icon} size={22} color="#E5E7EB" />
          <Text className="ml-2 text-lg font-bold text-white">{label}</Text>
        </>
      ) : (
        <>
          <Text className="mr-2 text-lg font-bold text-white">{label}</Text>
          <Feather name={icon} size={22} color="#E5E7EB" />
        </>
      )}
    </TouchableOpacity>
  );
}
