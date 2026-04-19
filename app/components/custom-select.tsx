import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  Modal,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface Option {
  label: string;
  value: string;
}

interface CustomSelectProps {
  options: Option[];
  selectedValue?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  disabled?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  dropdownMaxHeight?: number;
  onToggle?: (isOpen: boolean) => void;
}

import { useColorScheme } from "nativewind";

export function CustomSelect({
  options,
  selectedValue,
  onValueChange,
  placeholder = "Select...",
  className = "",
  triggerClassName = "",
  disabled = false,
  searchable = false,
  searchPlaceholder = "Search...",
  onToggle,
  dropdownMaxHeight = 400,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const selectedOption = options.find((opt) => opt.value === selectedValue);
  const filteredOptions = useMemo(() => {
    if (!searchable || !searchQuery.trim()) return options;
    const query = searchQuery.trim().toLowerCase();
    return options.filter((option) =>
      option.label.toLowerCase().includes(query)
    );
  }, [options, searchable, searchQuery]);

  const handleSelect = (value: string) => {
    if (onValueChange) {
      onValueChange(value);
    }
    setSearchQuery("");
    setIsOpen(false);
    onToggle?.(false);
  };

  return (
    <View className={`relative ${className}`}>
      <Pressable
        onPress={() => {
          if (disabled) return;
          const nextState = !isOpen;
          setIsOpen(nextState);
          onToggle?.(nextState);
        }}
        disabled={disabled}
        className={`rounded-2xl border px-4 h-14 flex-row items-center justify-between ${
          disabled
            ? "bg-gray-100 border-gray-200 dark:bg-white/5 dark:border-white/5"
            : "bg-gray-50 border-gray-100 dark:bg-white/5 dark:border-white/10"
        } ${triggerClassName}`}
      >
        <Text
          className={`flex-1 text-sm ${
            disabled
              ? "text-gray-400 dark:text-gray-600"
              : selectedOption
                ? "text-black dark:text-gray-100"
                : "text-gray-400 dark:text-gray-500"
          }`}
          numberOfLines={1}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </Text>
        {!disabled && (
          <Ionicons
            name={isOpen ? "chevron-up" : "chevron-down"}
            size={18}
            color={isDark ? "#999" : "#6B7280"}
          />
        )}
      </Pressable>

      {isOpen && (
        <>
          <Pressable
            style={{
              position: "absolute",
              top: -1000,
              left: -1000,
              right: -1000,
              bottom: -1000,
              zIndex: 998,
            }}
            onPress={() => {
              setIsOpen(false);
              onToggle?.(false);
            }}
          />

          <View
            className="absolute left-0 right-0 bg-white dark:bg-[#1A1A1A] border border-gray-100 dark:border-white/10 rounded-2xl overflow-hidden top-full mt-2 shadow-2xl"
            style={{ zIndex: 999, elevation: 5, maxHeight: dropdownMaxHeight }}
          >
            {searchable && (
              <View className="px-4 py-2 border-b border-gray-50 dark:border-white/5">
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder={searchPlaceholder}
                  placeholderTextColor="#6B7280"
                  className="h-10 text-sm text-black dark:text-white"
                />
              </View>
            )}
            <ScrollView
              nestedScrollEnabled={true}
              showsVerticalScrollIndicator={true}
              style={{ maxHeight: dropdownMaxHeight }}
              bounces={false}
            >
              {filteredOptions.map((option, index) => (
                <Pressable
                  key={option.value}
                  onPress={() => handleSelect(option.value)}
                  className={`px-4 py-3.5 ${
                    index < filteredOptions.length - 1 ? "border-b border-gray-50 dark:border-white/5" : ""
                  } ${
                    selectedValue === option.value
                      ? "bg-brand/5 dark:bg-brand/10"
                      : "bg-white dark:bg-[#1A1A1A] active:bg-gray-50 dark:active:bg-white/10"
                  }`}
                >
                  <Text
                    className={`text-sm ${
                      selectedValue === option.value
                        ? "text-brand font-bold"
                        : "text-gray-900 dark:text-gray-100"
                    }`}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </>
      )}
    </View>
  );
}
