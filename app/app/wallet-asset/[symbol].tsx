import { useState } from "react";
import { Image, Pressable, ScrollView, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";

import { getTokenHoldingBySymbol } from "@/components/wallet/data";
import { Text } from "@/components/themed/theme";
import { useToast } from "@/contexts/ToastContext";
import { BottomSheet } from "@/components/ui/bottom-sheet";

type AssetSheet = "receive" | "buy" | "send" | null;

export default function WalletAssetScreen() {
  const { symbol } = useLocalSearchParams<{ symbol: string }>();
  const asset = getTokenHoldingBySymbol(symbol);
  const toast = useToast();
  const [activeSheet, setActiveSheet] = useState<AssetSheet>(null);
  const [buyAmount, setBuyAmount] = useState("");
  const [sendAmount, setSendAmount] = useState("");
  const [sendAddress, setSendAddress] = useState("");

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
  const walletAddress = `avera-${asset.symbol.toLowerCase()}-8f3k-92da-44b1`;
  const estimatedAssetAmount =
    buyAmount && Number(buyAmount) > 0 && asset.value > 0
      ? (Number(buyAmount) / asset.value).toFixed(6)
      : "";

  const handleCopyAddress = () => {
    toast.show({
      title: "Address copied",
      description: walletAddress,
      variant: "success",
    });
  };

  const handleBuyContinue = () => {
    if (!buyAmount.trim()) {
      toast.show({
        title: "Enter amount",
        description: `Add how much ${asset.symbol} you want to buy.`,
        variant: "error",
      });
      return;
    }

    setActiveSheet(null);
    router.push({
      pathname: "/wallet-quote",
      params: {
        symbol: asset.symbol,
        amount: buyAmount,
      },
    });
    setBuyAmount("");
  };

  const handleSendContinue = () => {
    if (!sendAmount.trim() || !sendAddress.trim()) {
      toast.show({
        title: "Complete send details",
        description: "Amount and destination address are required.",
        variant: "error",
      });
      return;
    }

    setActiveSheet(null);
    setSendAmount("");
    setSendAddress("");
    toast.show({
      title: "Send preview ready",
      description: "Next step is network fee review and confirmation.",
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

            <Text className="mt-5 text-xl font-bold text-white">
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
              onPress={() => setActiveSheet("receive")}
              className="flex-1 flex-row items-center justify-center rounded-2xl bg-[#1A1A1C] py-4"
            >
              <Feather name="arrow-down-left" size={18} color="#FFFFFF" />
              <Text className="ml-2 text-base font-semibold text-white">
                Receive
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setActiveSheet("buy")}
              className="flex-1 flex-row items-center justify-center rounded-2xl bg-brand py-4"
            >
              <Text className="mr-2 text-base font-semibold text-white">
                Buy
              </Text>
              <Feather name="plus" size={18} color="#FFFFFF" />
            </Pressable>
            <Pressable
              onPress={() => setActiveSheet("send")}
              className="flex-1 flex-row items-center justify-center rounded-2xl bg-[#1A1A1C] py-4"
            >
              <Text className="mr-2 text-base font-semibold text-white">
                Send
              </Text>
              <Feather name="arrow-up-right" size={18} color="#FFFFFF" />
            </Pressable>
          </View>

          <View className="mt-8 rounded-2xl border border-white/5 bg-[#111214] p-5">
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

      <BottomSheet
        visible={activeSheet === "receive"}
        coverTabs
        title={`Receive ${asset.symbol}`}
        subtitle={`Use this address to receive ${asset.name} into your Avera wallet.`}
        onClose={() => setActiveSheet(null)}
      >
        <View>
          <View className="items-center rounded-2xl border border-white/5 bg-white/5 p-5">
            <View className="h-32 w-32 items-center justify-center rounded-2xl border border-white/10 bg-white">
              <View className="h-24 w-24 rounded-2xl bg-[#050505]" />
            </View>
            <Text className="mt-4 text-xs font-bold uppercase tracking-widest text-gray-500">
              Wallet address
            </Text>
            <Text className="mt-2 text-center text-base font-bold text-white">
              {walletAddress}
            </Text>
            <Pressable
              onPress={handleCopyAddress}
              className="mt-4 flex-row items-center rounded-full bg-brand px-4 py-2"
            >
              <Ionicons name="copy-outline" size={16} color="#FFFFFF" />
              <Text
                variant="none"
                className="ml-2 text-sm font-bold text-white"
              >
                Copy address
              </Text>
            </Pressable>
          </View>

          <View className="mt-5 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
            <View className="flex-row items-start">
              <Ionicons name="warning-outline" size={20} color="#F59E0B" />
              <Text className="ml-2 flex-1 text-sm leading-5 text-gray-300">
                Only send {asset.symbol} to this address. Sending another asset
                may result in permanent loss.
              </Text>
            </View>
          </View>
        </View>
      </BottomSheet>

      <BottomSheet
        visible={activeSheet === "buy"}
        coverTabs
        title={`Buy ${asset.symbol}`}
        subtitle="Preview your purchase before choosing a payment method."
        onClose={() => setActiveSheet(null)}
      >
        <View>
          <View className="flex-row items-center rounded-2xl border border-white/5 bg-white/5 p-4">
            <Image source={asset.icon} className="h-12 w-12 rounded-full" />
            <View className="ml-3 flex-1">
              <Text className="text-base font-bold text-white">
                {asset.name}
              </Text>
              <Text className="mt-1 text-sm text-gray-400">
                Market value ${assetValue}
              </Text>
            </View>
          </View>

          <View className="mt-5 flex-row gap-3">
            <View className="flex-1">
              <Text className="mb-2 text-sm font-bold text-white">
                Amount to buy
              </Text>
              <View className="flex-row items-center rounded-2xl border border-white/10 bg-white/5 px-4">
                <Text
                  variant="none"
                  className="text-xl pt-1 font-semibold text-brand"
                >
                  $
                </Text>
                <TextInput
                  value={buyAmount}
                  onChangeText={setBuyAmount}
                  keyboardType="numeric"
                  placeholder="0.00"
                  placeholderTextColor="#6B7280"
                  className="h-14 flex-1 px-2 py-0 text-lg font-bold leading-6 text-white"
                  textAlignVertical="center"
                />
              </View>
            </View>
            <View className="flex-1">
              <Text className="mb-2 text-sm font-bold text-white">
                Amount to get
              </Text>
              <View className="flex-row items-center rounded-2xl border border-white/10 bg-white/5 px-4">
                <TextInput
                  value={estimatedAssetAmount}
                  editable={false}
                  placeholder="0.00"
                  placeholderTextColor="#6B7280"
                  className="h-14 flex-1 py-0 pr-2 text-lg font-bold leading-6 text-white"
                  textAlignVertical="center"
                />
                <Text
                  variant="none"
                  className="text-sm pt-1 font-semibold text-brand"
                >
                  {asset.symbol}
                </Text>
              </View>
            </View>
          </View>
          <View className="mt-4 flex-row flex-wrap">
            {[50, 100, 250].map((amount) => (
              <Pressable
                key={amount}
                onPress={() => setBuyAmount(String(amount))}
                className="mb-2 mr-2 rounded-full bg-brand/10 px-4 py-2"
              >
                <Text variant="none" className="text-xs font-bold text-brand">
                  ${amount}
                </Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            onPress={handleBuyContinue}
            className="mt-6 h-14 items-center justify-center rounded-2xl bg-brand"
          >
            <Text variant="none" className="font-bold text-white">
              Continue
            </Text>
          </Pressable>
        </View>
      </BottomSheet>

      <BottomSheet
        visible={activeSheet === "send"}
        coverTabs
        title={`Send ${asset.symbol}`}
        subtitle="Enter the destination address and amount to preview network fees."
        onClose={() => setActiveSheet(null)}
      >
        <View>
          <View className="rounded-2xl border border-white/5 bg-white/5 p-4">
            <Text className="text-xs font-bold uppercase tracking-widest text-gray-500">
              Available
            </Text>
            <Text className="mt-2 text-2xl font-semibold text-white">
              {asset.amount}
            </Text>
          </View>

          <View className="mt-5">
            <Text className="mb-2 text-sm font-bold text-white">Amount</Text>
            <TextInput
              value={sendAmount}
              onChangeText={setSendAmount}
              keyboardType="numeric"
              placeholder={`0.00 ${asset.symbol}`}
              placeholderTextColor="#6B7280"
              className="h-14 rounded-2xl border border-white/10 bg-white/5 px-4 text-base text-white"
            />
          </View>

          <View className="mt-4">
            <Text className="mb-2 text-sm font-bold text-white">
              Destination address
            </Text>
            <TextInput
              value={sendAddress}
              onChangeText={setSendAddress}
              placeholder="Paste wallet address"
              placeholderTextColor="#6B7280"
              className="h-14 rounded-2xl border border-white/10 bg-white/5 px-4 text-base text-white"
            />
          </View>

          <View className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
            <View className="flex-row items-start">
              <Ionicons name="alert-circle-outline" size={20} color="#F87171" />
              <Text className="ml-2 flex-1 text-sm leading-5 text-gray-300">
                Crypto transfers are irreversible. Confirm the address carefully
                before sending.
              </Text>
            </View>
          </View>

          <Pressable
            onPress={handleSendContinue}
            className="mt-6 h-14 items-center justify-center rounded-2xl bg-brand"
          >
            <Text variant="none" className="font-bold text-white">
              Continue
            </Text>
          </Pressable>
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}
