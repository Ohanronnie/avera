import Categories from "@/components/products/categories";
import { Text } from "@/components/themed/theme";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useColorScheme } from "nativewind";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ProductCategoriesScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#0A0A0A]" edges={["top"]}>
      <View className="flex-row items-center border-b border-gray-100 bg-white px-5 py-4 dark:border-white/5 dark:bg-[#0A0A0A]">
        <Pressable
          onPress={() => router.back()}
          className="h-11 w-11 items-center justify-center rounded-full border border-gray-100 bg-gray-50 dark:border-white/10 dark:bg-white/5"
        >
          <Ionicons name="chevron-back" size={22} color={isDark ? "white" : "#111"} />
        </Pressable>
        <View className="ml-4 flex-1">
          <Text className="text-2xl font-bold text-black dark:text-white">
            Categories
          </Text>
          <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Browse products by what you need.
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1 bg-white dark:bg-[#0A0A0A]"
        contentContainerClassName="px-5 py-6"
        showsVerticalScrollIndicator={false}
      >
        <Categories limit={100} />
      </ScrollView>
    </SafeAreaView>
  );
}
