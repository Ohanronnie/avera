import { Input, InputField } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { View } from "react-native";
import type { KeyboardTypeOptions } from "react-native";

import { DARK_FIELD_BORDER, LIGHT_FIELD_BORDER } from "./constants";
import type { FormField } from "./useFormField";

interface ProfileTextInputProps {
  label: string;
  field: FormField;
  placeholder: string;
  isDark: boolean;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  keyboardType?: KeyboardTypeOptions;
  multiline?: boolean;
  numberOfLines?: number;
  spellCheck?: boolean;
  inputRightElement?: React.ReactNode;
  onBlur?: () => void;
}

export function ProfileTextInput({
  label,
  field,
  placeholder,
  isDark,
  autoCapitalize,
  keyboardType,
  multiline = false,
  numberOfLines,
  spellCheck,
  inputRightElement,
  onBlur,
}: ProfileTextInputProps) {
  const isTall = multiline;

  return (
    <View className="mt-4">
      <Text className="mb-2 text-base font-medium text-gray-900 dark:text-white">
        {label}
      </Text>
      <Input
        className={`rounded-xl border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-[#1A1A1A] ${
          isTall ? "h-28" : "h-14"
        }`}
        variant="outline"
        size="xl"
        style={{
          borderColor: field.focus
            ? "#3b82f6"
            : field.error
              ? "#ef4444"
              : isDark
                ? DARK_FIELD_BORDER
                : LIGHT_FIELD_BORDER,
        }}
      >
        <InputField
          placeholder={placeholder}
          value={field.value}
          onChangeText={field.setValue}
          onFocus={() => field.setFocus(true)}
          onBlur={() => {
            field.setFocus(false);
            onBlur?.();
          }}
          autoCapitalize={autoCapitalize}
          keyboardType={keyboardType}
          multiline={multiline}
          numberOfLines={numberOfLines}
          spellCheck={spellCheck}
          placeholderTextColor="#888"
          className={`px-4 text-sm text-black dark:text-white ${
            isTall ? "pt-3" : "h-14"
          }`}
          style={{
            textAlignVertical: isTall ? "top" : "center",
          }}
        />
        {inputRightElement}
      </Input>
      {field.error && <Text className="mt-1 text-red-500">{field.error}</Text>}
    </View>
  );
}
