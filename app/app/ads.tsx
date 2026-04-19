import { useEffect, useState } from "react";
import { View, Pressable, FlatList, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "@/components/themed/theme";
import { axiosInstance, BASE_URL } from "@/utils/axios";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

type Ad = {
  id: number;
  type: string;
  status: string;
  budget: string;
  spent: string;
  impressions: number;
  clicks: number;
  startDate: string;
  endDate: string;
  product: { id: number; name: string; images: { url: string }[] };
};

export default function AdsScreen() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const res = await axiosInstance.get("/ads/mine");
      setAds(res.data);
    } catch {} finally { setLoading(false); }
  };

  const getImageUrl = (url: string) =>
    url?.startsWith("http") ? url : `${BASE_URL}/${url}`;

  const renderAd = ({ item }: { item: Ad }) => {
    const image = item.product?.images?.[0]?.url;
    return (
      <View className="px-5 py-4 border-b border-gray-50">
        <View className="flex-row items-center">
          <View className="w-14 h-14 rounded-xl bg-gray-100 overflow-hidden">
            {image && <Image source={{ uri: getImageUrl(image) }} className="w-full h-full" />}
          </View>
          <View className="flex-1 ml-3">
            <Text className="text-base font-semibold text-gray-900">{item.product.name}</Text>
            <View className="flex-row items-center mt-1">
              <View className={`px-2 py-0.5 rounded-full ${item.status === "ACTIVE" ? "bg-green-100" : "bg-gray-100"}`}>
                <Text className={`text-xs font-semibold ${item.status === "ACTIVE" ? "text-green-700" : "text-gray-500"}`}>
                  {item.status}
                </Text>
              </View>
              <Text className="text-xs text-gray-400 ml-2">{item.type}</Text>
            </View>
          </View>
        </View>
        <View className="flex-row justify-between mt-3 bg-gray-50 rounded-xl p-3">
          <View className="items-center">
            <Text className="text-xs text-gray-400">Impressions</Text>
            <Text className="text-sm font-bold text-gray-900">{item.impressions}</Text>
          </View>
          <View className="items-center">
            <Text className="text-xs text-gray-400">Clicks</Text>
            <Text className="text-sm font-bold text-gray-900">{item.clicks}</Text>
          </View>
          <View className="items-center">
            <Text className="text-xs text-gray-400">Budget</Text>
            <Text className="text-sm font-bold text-gray-900">NGN {Number(item.budget).toLocaleString()}</Text>
          </View>
          <View className="items-center">
            <Text className="text-xs text-gray-400">Spent</Text>
            <Text className="text-sm font-bold text-gray-900">NGN {Number(item.spent).toLocaleString()}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center px-5 py-4 border-b border-gray-200">
        <Pressable onPress={() => router.back()} className="p-1 mr-3">
          <Ionicons name="arrow-back" size={24} color="black" />
        </Pressable>
        <Text className="text-lg font-bold text-gray-900">My Ads</Text>
      </View>

      <FlatList
        data={ads}
        renderItem={renderAd}
        keyExtractor={(item) => item.id.toString()}
        onRefresh={load}
        refreshing={loading}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center py-20">
            <Ionicons name="megaphone-outline" size={48} color="#D1D5DB" />
            <Text className="text-gray-400 mt-4">No ads yet</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
