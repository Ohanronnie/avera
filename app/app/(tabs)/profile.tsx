import { Text } from "@/components/themed/theme";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ScrollView, View, TouchableOpacity, Image, Switch } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Navbar } from "@/components/navbar";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";

export default function AccountScreen() {
  const insets = useSafeAreaInsets();
  const { isDark, toggleTheme } = useTheme();
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.replace("/(auth)/login");
  };

  const sections = [
    {
      title: "Selling",
      items: [
        { icon: "shirt-outline", label: "My Inventory", count: 12 },
        { icon: "wallet-outline", label: "Payments & Payouts" },
      ],
    },
    {
      title: "Account",
      items: [
        { icon: "chatbubbles-outline", label: "Messages", count: 2 },
        { icon: "heart-outline", label: "Saved Items", count: 45 },
        { icon: "settings-outline", label: "Settings" },
      ],
    },
    {
      title: "Support",
      items: [{ icon: "help-circle-outline", label: "Help & Support" }],
    },
  ];

  return (
    <View className="flex-1 bg-white dark:bg-[#0A0A0A]">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Full-Canvas Header (Spans inside Status Bar) */}
        <View 
          className="bg-brand pb-12 rounded-b-[32px] items-center relative overflow-hidden"
          style={{ paddingTop: insets.top + 12 }}
        >
          {/* Floating Actions */}
          <View className="w-full px-5 flex-row justify-between items-center">
            <TouchableOpacity className="w-10 h-10 bg-white/20 rounded-full items-center justify-center">
              <Ionicons name="chevron-back" size={20} color="white" />
            </TouchableOpacity>
            <TouchableOpacity className="w-10 h-10 bg-white/20 rounded-full items-center justify-center">
              <Ionicons name="ellipsis-vertical" size={20} color="white" />
            </TouchableOpacity>
          </View>

          {/* Centered Avatar */}
          <View className="mt-4">
            <View className="w-28 h-28 rounded-full border border-white p-1">
              <Image
                source={{ uri: "https://i.pravatar.cc/150" }}
                className="w-full h-full rounded-full"
              />
            </View>
          </View>

          {/* Centered Info */}
          <View className="items-center mt-6 px-6">
            <Text className="text-2xl font-bold text-white tracking-tight">
              Ronnie Ohan
            </Text>
            <Text className="text-xs text-center font-medium mt-1  tracking-widest text-gray-100">
              titiloyepaul68@gmail.com
            </Text>

          </View>
        </View>

        {/* Menu Sections */}
        <View className="px-4 pt-10 pb-6">

          {sections.map((section, sectionIdx) => (
            <View key={section.title} className="mb-10">
              <Text className="ml-4 mb-3 text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                {section.title}
              </Text>
              <View className="bg-gray-50/50 dark:bg-white/5 rounded-3xl border border-gray-100 dark:border-white/5 overflow-hidden">
                {section.items.map((item, index) => (
                  <TouchableOpacity 
                    key={index}
                    activeOpacity={0.7}
                    className={`flex-row items-center py-3 px-4 ${
                      index !== section.items.length - 1 ? "border-b border-gray-100/50 dark:border-white/5" : ""
                    }`}
                  >
                    <View className="w-11 h-11 bg-white dark:bg-white/10 rounded-2xl items-center justify-center border border-gray-100 dark:border-white/10">
                      <Ionicons name={item.icon as any} size={20} color={isDark ? "#FFF" : "#111"} />
                    </View>
                    <Text className="ml-4 flex-1 text-base font-semibold text-gray-800 dark:text-gray-200 tracking-tight">{item.label}</Text>
                    {item.count && (
                      <View className="bg-brand/10 px-2.5 py-1 rounded-xl mr-2">
                        <Text className="text-brand text-xs font-black">{item.count}</Text>
                      </View>
                    )}
                    <Ionicons name="chevron-forward" size={16} color={isDark ? "#444" : "#D1D5DB"} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
          
          {/* Preferences Card (Now at the bottom) */}
          <View className="mb-10">
            <Text className="ml-4 mb-3 text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              Preferences
            </Text>
            <View className="bg-gray-50/50 dark:bg-white/5 rounded-3xl border border-gray-100 dark:border-white/5 overflow-hidden">
              <View className="flex-row items-center py-4 px-4">
                <View className="w-11 h-11 bg-white dark:bg-white/5 rounded-2xl items-center justify-center border border-gray-100 dark:border-white/10">
                  <Ionicons name={isDark ? "moon" : "sunny-outline"} size={20} color={isDark ? "#A78BFA" : "#111"} />
                </View>
                <Text className="ml-4 flex-1 text-base font-semibold text-gray-800 dark:text-gray-200 tracking-tight">Dark Mode</Text>
                <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: "#E5E7EB", true: "#2563EB" }}
                thumbColor={"#FFF"}
              />
            </View>
          </View>
        </View>
      </View>

      {/* Logout Section */}
        <View className="px-4 pb-12">
          <TouchableOpacity 
            onPress={handleLogout}
            activeOpacity={0.8}
            className="flex-row items-center justify-center bg-gray-50 dark:bg-red-500/5 py-5 rounded-3xl border border-gray-100 dark:border-red-500/10"
          >
            <Ionicons name="log-out-outline" size={20} color="#EF4444" />
            <Text className="ml-3 font-bold text-red-500">Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Floating Create Button */}
      <TouchableOpacity
        onPress={() => router.push("/product/create")}
        className="absolute bottom-8 right-8 w-16 h-16 bg-brand rounded-full items-center justify-center border-4 border-white dark:border-[#0A0A0A] active:scale-95 transition-all"
        style={{ elevation: 0 }}
      >
        <Ionicons name="add" size={32} color="white" />
      </TouchableOpacity>
    </View>
  );
}
