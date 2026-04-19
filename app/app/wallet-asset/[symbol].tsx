import { Image, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";

import { getTokenHoldingBySymbol } from "@/components/wallet/data";
import { Text } from "@/components/themed/theme";
import { useToast } from "@/contexts/ToastContext";

export default function WalletAssetScreen() {
  const { symbol } = useLocalSearchParams<{ symbol: string }>();
  const asset = getTokenHoldingBySymbol(symbol);
  const toast = useToast();

  if (!asset) {
    return (
      <SafeAreaView className="flex-1 bg-[#050505]" edges={["top"]}>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-xl font-semibold text-white">
            Asset not found
          </Text>
          <Pressable
            onPress={() => router.back()}
            className="mt-4 rounded-2xl bg-[#1A1A1C] px-5 py-3"
          >
            <Text className="font-semibold text-white">Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const isPositive = asset.change >= 0;
  const assetValue = asset.value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const handleBuy = () => {
    toast.show({
      title: `Buy ${asset.symbol}`,
      description: `${asset.name} purchases will be available soon.`,
      variant: "info",
    });
  };
  const handleReceive = () => {
    toast.show({
      title: `Receive ${asset.symbol}`,
      description: `Receive ${asset.symbol} into your wallet.`,
      variant: "info",
    });
  };
  const handleSend = () => {
    toast.show({
      title: `Send ${asset.symbol}`,
      description: `Send ${asset.symbol} from your wallet.`,
      variant: "info",
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-[#050505]" edges={["top"]}>
      <ScrollView
        className="flex-1 bg-[#050505]"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-4 pt-3">
          <View className="flex-row items-center justify-between">
            <Pressable
              onPress={() => router.back()}
              className="h-11 w-11 items-center justify-center rounded-full bg-white/5"
            >
              <Ionicons name="chevron-back" size={20} color="#F9FAFB" />
            </Pressable>

            <Text className="text-base font-semibold text-white">
              {asset.symbol}
            </Text>

            <Pressable className="h-11 w-11 items-center justify-center rounded-full bg-white/5">
              <Ionicons name="ellipsis-horizontal" size={20} color="#F9FAFB" />
            </Pressable>
          </View>

          <View className="mt-10 items-center">
            <View className="h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-white/5">
              <Image
                source={asset.icon}
                className="h-24 w-24"
                resizeMode="cover"
              />
            </View>

            <Text className="mt-5 text-3xl font-bold text-white">
              {asset.name}
            </Text>
            <Text className="mt-2 text-sm text-gray-400">{asset.amount}</Text>

            <Text className="mt-6 text-5xl font-extrabold tracking-tight text-white">
              ${assetValue}
            </Text>
            <Text
              variant="none"
              className={`mt-3 text-base font-semibold ${
                isPositive ? "text-[#4ADE80]" : "text-[#F87171]"
              }`}
            >
              {isPositive ? "+" : ""}
              {asset.change.toFixed(2)}% today
            </Text>
          </View>

          <View className="mt-8 flex-row gap-3">
            <Pressable
              onPress={handleReceive}
              className="flex-1 flex-row items-center justify-center rounded-2xl bg-[#1A1A1C] py-4"
            >
              <Feather name="arrow-down-left" size={18} color="#FFFFFF" />
              <Text className="ml-2 text-base font-semibold text-white">
                Receive
              </Text>
            </Pressable>
            <Pressable
              onPress={handleBuy}
              className="flex-1 flex-row items-center justify-center rounded-2xl bg-brand py-4"
            >
              <Text className="mr-2 text-base font-semibold text-white">
                Buy
              </Text>
              <Feather name="plus" size={18} color="#FFFFFF" />
            </Pressable>
            <Pressable
              onPress={handleSend}
              className="flex-1 flex-row items-center justify-center rounded-2xl bg-[#1A1A1C] py-4"
            >
              <Text className="mr-2 text-base font-semibold text-white">
                Send
              </Text>
              <Feather name="arrow-up-right" size={18} color="#FFFFFF" />
            </Pressable>
          </View>

          <View className="mt-8 rounded-3xl border border-white/5 bg-[#111214] p-5">
            <Text className="text-sm font-medium uppercase tracking-widest text-gray-500">
              Asset Details
            </Text>

            <View className="mt-5 flex-row items-center justify-between border-b border-white/5 pb-4">
              <Text className="text-sm text-gray-400">Symbol</Text>
              <Text className="text-base font-semibold text-white">
                {asset.symbol}
              </Text>
            </View>

            <View className="flex-row items-center justify-between border-b border-white/5 py-4">
              <Text className="text-sm text-gray-400">Holdings</Text>
              <Text className="text-base font-semibold text-white">
                {asset.amount}
              </Text>
            </View>

            <View className="flex-row items-center justify-between border-b border-white/5 py-4">
              <Text className="text-sm text-gray-400">Market Value</Text>
              <Text className="text-base font-semibold text-white">
                ${assetValue}
              </Text>
            </View>

            <View className="flex-row items-center justify-between pt-4">
              <Text className="text-sm text-gray-400">Daily Change</Text>
              <Text
                variant="none"
                className={`text-base font-semibold ${
                  isPositive ? "text-[#4ADE80]" : "text-[#F87171]"
                }`}
              >
                {isPositive ? "+" : ""}
                {asset.change.toFixed(2)}%
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
