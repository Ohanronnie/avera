import { Text } from "@/components/themed/theme";
import { axiosInstance } from "@/utils/axios";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { useColorScheme } from "nativewind";

function Categories({
  limit = 5,
  wrap = true,
}: {
  limit?: number;
  wrap?: boolean;
}) {
  const [categories, setCategories] = useState<any>([]);
  const [loading, setLoading] = useState(true);
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const openCategory = (category: any) => {
    router.push({
      pathname: "/product/search",
      params: {
        categoryId: String(category.id),
        categoryName: category.name,
      },
    });
  };

  useEffect(function () {
    axiosInstance
      .get("/categories")
      .then(({ data }) => {
        setCategories((data as any).slice(0, limit));
      })
      .catch((error) => null)
      .finally(() => setLoading(false));
  }, []);
  if (loading) {
    return (
      <View className="flex-row flex-wrap">
        {Array.from({ length: limit || 6 }).map((_, i) => (
          <View
            key={i}
            className="flex flex-col items-center justify-center mr-6 mb-6"
          >
            <View className="h-20 w-20 rounded-full bg-gray-200 dark:bg-white/5" />
            <View className="mt-2 h-4 w-16 rounded bg-gray-200 dark:bg-white/5" />
          </View>
        ))}
      </View>
    );
  }

  // Render categories
  if (!wrap)
    return (
      <View className="flex-row flex-wrap">
        {categories.map((category, index) => (
          <View
            className="flex flex-col items-center justify-center mr-6 mb-6"
            key={index}
          >
            <Pressable
              onPress={() => openCategory(category)}
              className="h-20 w-20 flex items-center justify-center bg-background-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-full"
            >
              <Ionicons
                name={category.iconName as any}
                size={28}
                color={isDark ? "white" : "black"}
              />
            </Pressable>
            <Text className="mt-2 text-sm font-medium">{category.name}</Text>
          </View>
        ))}
      </View>
    );
  return (
    <View className="flex-row w-full justify-between flex-wrap">
      {categories.map((category, index) => (
        <View
          key={index}
          className="w-[30%] mb-4 flex items-center justify-center" // 30% width allows spacing between 3 items
        >
          <Pressable
            onPress={() => openCategory(category)}
            className="h-20 w-20 flex items-center justify-center bg-background-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-full"
          >
            <Ionicons
              name={category.iconName as any}
              size={28}
              color={isDark ? "white" : "black"}
            />
          </Pressable>
          <Text className="mt-2 text-sm font-medium text-center">
            {category.name}
          </Text>
        </View>
      ))}
    </View>
  );
}
export default Categories;
