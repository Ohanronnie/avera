import { Text } from "@/components/themed/theme";
import { Navbar } from "@/components/navbar";
import { router } from "expo-router";
import { ScrollView, View, TouchableOpacity, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

export default function CreateIntroScreen() {

  const features = [
    {
      icon: "flash-outline",
      title: "Quick Listing",
      desc: "List your item in less than 2 minutes.",
    },
    {
      icon: "people-outline",
      title: "Wide Reach",
      desc: "Your product will be seen by thousands.",
    },
    {
      icon: "shield-checkmark-outline",
      title: "Secure Sales",
      desc: "Every transaction is safe and verified.",
    },
  ];

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#0A0A0A]" edges={["top", "bottom"]}>
      <Navbar title="Start Selling" showBack={true} />
      
      <ScrollView 
        className="flex-1 px-6 bg-white dark:bg-[#0A0A0A]"
        showsVerticalScrollIndicator={false}
      >
        <View className="items-center py-10">
          <View className="w-48 h-48 bg-brand/5 dark:bg-brand/10 rounded-full items-center justify-center mb-8">
            <Ionicons name="storefront-outline" size={80} color="#2563EB" />
          </View>
          
          <Text className="text-3xl font-bold text-black dark:text-white text-center">
            Ready to make some money?
          </Text>
          <Text className="text-gray-500 dark:text-gray-400 text-center mt-3 text-base px-4">
            Join thousands of sellers on Avera. It's fast, easy, and secure.
          </Text>
        </View>

        <View className="space-y-6 mt-4">
          {features.map((feature, i) => (
            <View key={i} className="flex-row items-center bg-gray-50/50 dark:bg-[#0D0D0D] p-4 rounded-2xl border border-gray-100 dark:border-white/[0.03] mb-4">
              <View className="w-12 h-12 bg-white dark:bg-white/5 rounded-xl items-center justify-center border border-gray-100 dark:border-white/10">
                <Ionicons name={feature.icon as any} size={24} color="#2563EB" />
              </View>
              <View className="ml-4 flex-1">
                <Text className="font-bold text-black dark:text-white text-base">{feature.title}</Text>
                <Text className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">{feature.desc}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <View className="px-6 py-5 border-t border-gray-50 dark:border-white/5 bg-white dark:bg-[#0A0A0A]">
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.push("/product/create/basic-info")}
          className="bg-brand h-14 justify-center rounded-2xl flex-row items-center"
        >
          <Text className="text-white font-bold text-base">Start Listing Now</Text>
        </TouchableOpacity>
        <Text className="text-center text-gray-400 dark:text-gray-500 text-[10px] mt-3">
          By continuing, you agree to Avera's Selling Policies
        </Text>
      </View>
    </SafeAreaView>
  );
}
