import { useEffect, useState } from "react";
import { View, Pressable, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "@/components/themed/theme";
import { axiosInstance } from "@/utils/axios";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

type Notif = {
  id: number;
  type: string;
  title: string;
  body: string;
  data: any;
  readAt: string | null;
  createdAt: string;
};

const TYPE_ICONS: Record<string, string> = {
  ORDER: "receipt-outline",
  ESCROW: "shield-checkmark-outline",
  WALLET: "wallet-outline",
  DISPUTE: "warning-outline",
};

export default function NotificationsScreen() {
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const res = await axiosInstance.get("/notifications");
      setNotifs(res.data);
    } catch {} finally { setLoading(false); }
  };

  const markAllRead = async () => {
    try {
      await axiosInstance.patch("/notifications/read-all");
      setNotifs((prev) => prev.map((n) => ({ ...n, readAt: new Date().toISOString() })));
    } catch {}
  };

  const handleTap = async (notif: Notif) => {
    if (!notif.readAt) {
      await axiosInstance.patch(`/notifications/${notif.id}/read`);
      setNotifs((prev) => prev.map((n) => n.id === notif.id ? { ...n, readAt: new Date().toISOString() } : n));
    }
    if (notif.data?.orderId) router.push(`/order/${notif.data.orderId}`);
  };

  const renderItem = ({ item }: { item: Notif }) => (
    <Pressable
      onPress={() => handleTap(item)}
      className={`flex-row px-5 py-4 border-b border-gray-50 ${!item.readAt ? "bg-blue-50/50" : ""}`}
    >
      <View className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center">
        <Ionicons name={(TYPE_ICONS[item.type] || "notifications-outline") as any} size={18} color="#374151" />
      </View>
      <View className="flex-1 ml-3">
        <Text className="text-sm font-semibold text-gray-900">{item.title}</Text>
        <Text className="text-sm text-gray-500 mt-0.5">{item.body}</Text>
        <Text className="text-xs text-gray-400 mt-1">
          {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>
      {!item.readAt && <View className="w-2 h-2 rounded-full bg-blue-500 self-center" />}
    </Pressable>
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center justify-between px-5 py-4 border-b border-gray-200">
        <View className="flex-row items-center">
          <Pressable onPress={() => router.back()} className="p-1 mr-3">
            <Ionicons name="arrow-back" size={24} color="black" />
          </Pressable>
          <Text className="text-lg font-bold text-gray-900">Notifications</Text>
        </View>
        <Pressable onPress={markAllRead}>
          <Text className="text-sm text-blue-600 font-medium">Mark all read</Text>
        </Pressable>
      </View>

      <FlatList
        data={notifs}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        onRefresh={load}
        refreshing={loading}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center py-20">
            <Ionicons name="notifications-off-outline" size={48} color="#D1D5DB" />
            <Text className="text-gray-400 mt-4">No notifications</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
