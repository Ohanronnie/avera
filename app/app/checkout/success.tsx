import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Text } from "@/components/themed/theme";

export default function CheckoutSuccessScreen() {
  const params = useLocalSearchParams<{ orderId?: string }>();

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#0A0A0A]">
      <View className="flex-1 items-center justify-center px-6">
        <View className="h-20 w-20 items-center justify-center rounded-full bg-emerald-500/15">
          <Ionicons name="checkmark" size={40} color="#10B981" />
        </View>

        <Text className="mt-6 text-center text-3xl font-bold text-gray-950 dark:text-white">
          Payment received
        </Text>
        <Text className="mt-3 text-center text-base leading-7 text-gray-600 dark:text-gray-300">
          Your payment has been verified and the order is now held in escrow.
          {params.orderId ? ` Order #${params.orderId}.` : ""}
        </Text>

        <Pressable
          onPress={() => router.replace("/(tabs)/orders")}
          className="mt-8 h-14 w-full items-center justify-center rounded-full bg-brand"
        >
          <Text variant="none" className="text-base font-bold text-white">
            View orders
          </Text>
        </Pressable>

        <Pressable
          onPress={() => router.dismissAll()}
          className="mt-3 h-14 w-full items-center justify-center rounded-full border border-gray-200 bg-white dark:border-white/10 dark:bg-white/5"
        >
          <Text className="text-base font-bold text-gray-950 dark:text-white">
            Done
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
