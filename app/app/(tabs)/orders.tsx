import { Text } from "@/components/themed/theme";
import { View, ScrollView, Pressable, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { useColorScheme } from "nativewind";

export default function OrdersScreen() {
  const [activeTab, setActiveTab] = useState("Active");
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const tabs = ["Active", "Completed", "Cancelled"];

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#0A0A0A]" edges={["top"]}>
      {/* Header */}
      <View className="px-5 py-4 border-b border-gray-100 dark:border-white/5 bg-white dark:bg-[#0A0A0A]">
        <Text className="text-2xl font-bold text-gray-900 dark:text-white">Your Orders</Text>
      </View>

      {/* Tabs */}
      <View className="flex-row px-5 mt-4 border-b border-gray-100 dark:border-white/5">
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            className={`mr-8 pb-3 ${activeTab === tab ? "border-b-2 border-brand" : ""}`}
          >
            <Text 
              className={`text-sm font-bold ${activeTab === tab ? "text-brand" : "text-gray-400"}`}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="flex-1 items-center justify-center py-32 px-10">
          <View className="w-24 h-24 bg-gray-50 dark:bg-white/5 rounded-full items-center justify-center mb-6">
            <Ionicons name="receipt-outline" size={40} color={isDark ? "#333" : "#D1D5DB"} />
          </View>
          <Text className="text-xl font-bold text-gray-900 dark:text-white text-center">
            No {activeTab.toLowerCase()} orders
          </Text>
          <Text className="text-sm text-gray-500 text-center mt-2">
            When you buy or sell items, they will appear here.
          </Text>
          
          <TouchableOpacity 
            className="mt-8 bg-brand px-8 py-4 rounded-2xl"
            activeOpacity={0.8}
          >
            <Text className="text-white font-bold">Start Shopping</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
