import { Text } from "@/components/themed/theme";
import { Input, InputField } from "@/components/ui/input";
import { View } from "react-native";
import { useColorScheme } from "nativewind";

interface FormInputProps {
  label: string;
  value: string;
  onChange: (text: string) => void;
  placeholder: string;
  multiline?: boolean;
  numberOfLines?: number;
  keyboardType?: "default" | "numeric";
  error?: string;
  className?: string;
  hint?: string;
}

export function FormInput({
  label,
  value,
  onChange,
  placeholder,
  multiline = false,
  numberOfLines = 4,
  keyboardType = "default",
  error,
  className = "rounded-2xl",
  hint,
}: FormInputProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  // Dynamic height based on lines, but keeping it within reasonable bounds
  const containerHeight = multiline
    ? numberOfLines <= 2
      ? "h-20"
      : "h-32"
    : "h-14";

  return (
    <View className="mb-6">
      <View className="flex-row justify-between items-center mb-1.5 px-1">
        <Text className="text-sm font-semibold text-gray-700 dark:text-gray-400 capitalize tracking-tight">
          {label}
        </Text>
        {hint && (
          <Text className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
            {hint}
          </Text>
        )}
      </View>
      <Input
        variant="outline"
        size="xl"
        className={`${className} ${containerHeight}`}
        style={{
          borderWidth: 1,
          borderColor: error
            ? "#ef4444"
            : isDark
              ? "rgba(255,255,255,0.1)"
              : "#E5E7EB",
          backgroundColor: isDark ? "#1A1A1A" : "#F9FAFB",
        }}
      >
        <InputField
          placeholder={placeholder}
          multiline={multiline}
          numberOfLines={multiline ? numberOfLines : undefined}
          keyboardType={keyboardType}
          value={value}
          onChangeText={onChange}
          className={`text-black dark:text-white text-sm px-4 ${multiline ? "py-3" : ""}`}
          placeholderTextColor="#6B7280"
          textAlignVertical={multiline ? "top" : "center"}
        />
      </Input>
      {error && (
        <View className="flex-row items-center mt-1.5 px-1">
          <Text className="text-red-500 text-xs font-medium">{error}</Text>
        </View>
      )}
    </View>
  );
}
