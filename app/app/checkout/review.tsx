import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useColorScheme } from "nativewind";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Text } from "@/components/themed/theme";
import { useToast } from "@/contexts/ToastContext";
import { BASE_URL, axiosInstance } from "@/utils/axios";

const parseAmount = (value?: string | string[]) => {
  const rawValue = Array.isArray(value) ? value[0] : value;
  return Number(String(rawValue || "").replace(/[^0-9.]/g, "")) || 0;
};

const parseNumber = (value?: string | string[], fallback = 1) => {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const numericValue = Number(rawValue);
  return Number.isFinite(numericValue) && numericValue > 0
    ? numericValue
    : fallback;
};

const formatPrice = (value: number) =>
  `₦${Number(value || 0).toLocaleString()}`;

export default function CheckoutReviewScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const toast = useToast();
  const [sellerAccount, setSellerAccount] = useState<{
    accountName: string;
    accountNumber: string;
    bankName: string;
  } | null>(null);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<{
    id: number;
    code: string;
    statusText: string;
    totalAmount: number;
  } | null>(null);
  const [deliveryPhone, setDeliveryPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryCity, setDeliveryCity] = useState("");
  const [deliveryState, setDeliveryState] = useState("");
  const params = useLocalSearchParams<{
    productId?: string;
    sellerId?: string;
    productName?: string;
    sellerName?: string;
    productImage?: string;
    unitPrice?: string;
    quantity?: string;
    availableQuantity?: string;
    source?: string;
    conversationId?: string;
    offerMessageId?: string;
  }>();

  const productName = params.productName || "Product listing";
  const sellerName = params.sellerName || "Avera seller";
  const unitPrice = parseAmount(params.unitPrice);
  const quantity = parseNumber(params.quantity);
  const availableQuantity = parseNumber(params.availableQuantity, quantity);
  const subtotal = unitPrice * quantity;
  const escrowFee = Math.round(subtotal * 0.015);
  const total = subtotal + escrowFee;
  const isOfferCheckout = params.source === "offer";
  const transferUrl = sellerAccount
    ? `${BASE_URL}/send-money/${sellerAccount.accountNumber}/${total}`
    : null;

  useEffect(() => {
    let isMounted = true;

    const loadSellerAccount = async () => {
      if (!params.sellerId) return;

      try {
        const { data } = await axiosInstance.get(
          `/wallet/users/${params.sellerId}/account`,
        );
        if (isMounted) setSellerAccount(data);
      } catch {
        if (isMounted) setSellerAccount(null);
      }
    };

    loadSellerAccount();

    return () => {
      isMounted = false;
    };
  }, [params.sellerId]);

  const createOrder = async () => {
    if (createdOrder) {
      toast.show({
        title: "Mock payment route",
        description: transferUrl || "Seller virtual account is still loading.",
        variant: "info",
      });
      return;
    }

    if (!params.productId) return;

    try {
      setCreatingOrder(true);
      const { data } = await axiosInstance.post("/orders", {
        productId: Number(params.productId),
        conversationId: params.conversationId
          ? Number(params.conversationId)
          : undefined,
        offerMessageId: params.offerMessageId
          ? Number(params.offerMessageId)
          : undefined,
        quantity,
        source: isOfferCheckout ? "offer" : "buy_now",
        deliveryPhone: deliveryPhone.trim() || undefined,
        deliveryAddress: deliveryAddress.trim() || undefined,
        deliveryCity: deliveryCity.trim() || undefined,
        deliveryState: deliveryState.trim() || undefined,
        deliveryCountry: "Nigeria",
      });

      setCreatedOrder(data.order);
      setSellerAccount(data.paymentAccount);
      toast.show({
        title: "Order created",
        description: "Transfer the exact total to lock payment in escrow.",
        variant: "success",
      });
    } catch (error: any) {
      toast.show({
        title: "Order unavailable",
        description:
          error?.response?.data?.message ||
          "We couldn't create this order right now.",
        variant: "error",
      });
    } finally {
      setCreatingOrder(false);
    }
  };

  const showTransferRoute = () => {
    toast.show({
      title: "Mock payment route",
      description: transferUrl || "Seller virtual account is still loading.",
      variant: "info",
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#0A0A0A]" edges={["top"]}>
      <View className="border-b border-gray-100 bg-white px-5 py-4 dark:border-white/5 dark:bg-[#0A0A0A]">
        <View className="flex-row items-center">
          <Pressable
            onPress={() => router.back()}
            className="h-11 w-11 items-center justify-center rounded-full border border-gray-100 bg-gray-50 dark:border-white/10 dark:bg-white/5"
          >
            <Ionicons
              name="chevron-back"
              size={22}
              color={isDark ? "white" : "#111827"}
            />
          </Pressable>
          <View className="ml-3 flex-1">
            <Text className="text-2xl font-bold text-gray-950 dark:text-white">
              Review order
            </Text>
            <Text className="mt-0.5 text-xs font-medium text-gray-500 dark:text-gray-400">
              Confirm the details before escrow payment.
            </Text>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-5 pb-28 pt-5">
          <View className="flex-row rounded-3xl border border-gray-100 bg-gray-50 p-3 dark:border-white/5 dark:bg-white/5">
            {params.productImage ? (
              <Image
                source={{ uri: params.productImage }}
                className="h-24 w-24 rounded-2xl bg-gray-200 dark:bg-white/10"
              />
            ) : (
              <View className="h-24 w-24 items-center justify-center rounded-2xl bg-brand/10">
                <Ionicons name="cube-outline" size={26} color="#2563EB" />
              </View>
            )}
            <View className="ml-3 flex-1 justify-center">
              <Text
                numberOfLines={2}
                className="text-lg font-black text-gray-950 dark:text-white"
              >
                {productName}
              </Text>
              <Text className="mt-1 text-sm font-black text-brand">
                {formatPrice(unitPrice)}
              </Text>
              <Text className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Sold by {sellerName}
              </Text>
            </View>
          </View>

          {isOfferCheckout ? (
            <View className="mt-5 rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-4">
              <View className="flex-row items-start">
                <View className="h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10">
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={22}
                    color="#10B981"
                  />
                </View>
                <View className="ml-3 flex-1">
                  <Text
                    variant="none"
                    className="font-bold text-emerald-600 dark:text-emerald-400"
                  >
                    Accepted offer
                  </Text>
                  <Text className="mt-1 text-sm leading-5 text-gray-600 dark:text-gray-300">
                    The seller accepted this price. Review the final total
                    before creating the order.
                  </Text>
                </View>
              </View>
            </View>
          ) : null}

          <View className="mt-5 rounded-3xl border border-brand/20 bg-brand/10 p-4">
            <View className="flex-row items-start">
              <View className="h-10 w-10 items-center justify-center rounded-2xl bg-brand/10">
                <Ionicons
                  name="shield-checkmark-outline"
                  size={20}
                  color="#2563EB"
                />
              </View>
              <View className="ml-3 flex-1">
                <Text variant="none" className="font-bold text-brand">
                  Escrow protected
                </Text>
                <Text className="mt-1 text-sm leading-5 text-gray-600 dark:text-gray-300">
                  Payment will be held safely until delivery or handoff is
                  confirmed.
                </Text>
              </View>
            </View>
          </View>

          <View className="mt-5 rounded-3xl border border-gray-100 bg-white p-4 dark:border-white/5 dark:bg-white/5">
            <View className="flex-row items-start">
              <View className="h-10 w-10 items-center justify-center rounded-2xl bg-brand/10">
                <Ionicons name="business-outline" size={20} color="#2563EB" />
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-base font-bold text-gray-950 dark:text-white">
                  Transfer to seller escrow account
                </Text>
                <Text className="mt-1 text-sm leading-5 text-gray-500 dark:text-gray-400">
                  For now this is a mock transfer. Opening the test route will
                  simulate a webhook and lock the money for this seller.
                </Text>
              </View>
            </View>

            <View className="mt-4 rounded-2xl bg-gray-50 dark:bg-white/5">
              {[
                { label: "Bank", value: sellerAccount?.bankName || "Loading" },
                {
                  label: "Account name",
                  value: sellerAccount?.accountName || sellerName,
                },
                {
                  label: "Account number",
                  value: sellerAccount?.accountNumber || "Generating",
                },
                { label: "Amount", value: formatPrice(total) },
              ].map((item, index) => (
                <View
                  key={item.label}
                  className={`px-4 py-3 ${
                    index !== 3
                      ? "border-b border-gray-100 dark:border-white/5"
                      : ""
                  }`}
                >
                  <Text className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                    {item.label}
                  </Text>
                  <Text className="mt-1 text-sm font-bold text-gray-950 dark:text-white">
                    {item.value}
                  </Text>
                </View>
              ))}
            </View>

            {transferUrl ? (
              <View className="mt-4 rounded-2xl border border-dashed border-brand/30 bg-brand/5 p-3">
                <Text
                  variant="none"
                  className="text-[10px] font-black uppercase tracking-widest text-brand"
                >
                  Dev transfer route
                </Text>
                <Text className="mt-2 text-xs font-semibold leading-5 text-gray-600 dark:text-gray-300">
                  {transferUrl}
                </Text>
              </View>
            ) : null}
          </View>

          <View className="mt-5 rounded-3xl border border-gray-100 bg-white p-4 dark:border-white/5 dark:bg-white/5">
            <View className="mb-4 flex-row items-start">
              <View className="h-10 w-10 items-center justify-center rounded-2xl bg-brand/10">
                <Ionicons name="location-outline" size={20} color="#2563EB" />
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-base font-bold text-gray-950 dark:text-white">
                  Delivery details
                </Text>
                <Text className="mt-1 text-sm leading-5 text-gray-500 dark:text-gray-400">
                  The seller sees this once payment is confirmed.
                </Text>
              </View>
            </View>
            <TextInput
              value={deliveryAddress}
              onChangeText={setDeliveryAddress}
              placeholder="Delivery address"
              placeholderTextColor="#9CA3AF"
              className="mb-3 h-14 rounded-2xl border border-gray-100 bg-gray-50 px-4 text-base text-gray-950 dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
            <View className="mb-3 flex-row gap-3">
              <TextInput
                value={deliveryCity}
                onChangeText={setDeliveryCity}
                placeholder="City"
                placeholderTextColor="#9CA3AF"
                className="h-14 flex-1 rounded-2xl border border-gray-100 bg-gray-50 px-4 text-base text-gray-950 dark:border-white/10 dark:bg-white/5 dark:text-white"
              />
              <TextInput
                value={deliveryState}
                onChangeText={setDeliveryState}
                placeholder="State"
                placeholderTextColor="#9CA3AF"
                className="h-14 flex-1 rounded-2xl border border-gray-100 bg-gray-50 px-4 text-base text-gray-950 dark:border-white/10 dark:bg-white/5 dark:text-white"
              />
            </View>
            <TextInput
              value={deliveryPhone}
              onChangeText={setDeliveryPhone}
              keyboardType="phone-pad"
              placeholder="Phone number"
              placeholderTextColor="#9CA3AF"
              className="h-14 rounded-2xl border border-gray-100 bg-gray-50 px-4 text-base text-gray-950 dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
          </View>

          {createdOrder ? (
            <View className="mt-5 rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-4">
              <Text
                variant="none"
                className="text-xs font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400"
              >
                Order created
              </Text>
              <Text className="mt-2 text-2xl font-black text-gray-950 dark:text-white">
                {createdOrder.code}
              </Text>
              <Text className="mt-1 text-sm font-semibold text-gray-600 dark:text-gray-300">
                {createdOrder.statusText}. Transfer the exact total to simulate
                payment confirmation.
              </Text>
            </View>
          ) : null}

          <View className="mt-5 rounded-3xl border border-gray-100 bg-white p-4 dark:border-white/5 dark:bg-white/5">
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-bold text-gray-950 dark:text-white">
                Quantity
              </Text>
              <View className="items-end">
                <Text className="text-lg font-black text-gray-950 dark:text-white">
                  {quantity}
                </Text>
                <Text className="text-xs text-gray-500 dark:text-gray-400">
                  {availableQuantity} available
                </Text>
              </View>
            </View>
          </View>

          <View className="mt-5 rounded-3xl border border-gray-100 bg-white p-4 dark:border-white/5 dark:bg-white/5">
            {[
              { label: "Unit price", value: formatPrice(unitPrice) },
              { label: "Quantity", value: `x${quantity}` },
              { label: "Subtotal", value: formatPrice(subtotal) },
              { label: "Escrow fee", value: formatPrice(escrowFee) },
              { label: "Delivery", value: "Choose later" },
            ].map((item) => (
              <View
                key={item.label}
                className="mb-3 flex-row items-center justify-between"
              >
                <Text className="text-sm text-gray-500 dark:text-gray-400">
                  {item.label}
                </Text>
                <Text className="text-sm font-bold text-gray-950 dark:text-white">
                  {item.value}
                </Text>
              </View>
            ))}
            <View className="mt-1 border-t border-gray-100 pt-4 dark:border-white/10">
              <View className="flex-row items-center justify-between">
                <Text className="text-base font-bold text-gray-950 dark:text-white">
                  Total
                </Text>
                <Text className="text-2xl font-black text-brand">
                  {formatPrice(total)}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <View className="border-t border-gray-100 bg-white px-5 pb-6 pt-4 dark:border-white/5 dark:bg-[#0A0A0A]">
        <Pressable
          onPress={createdOrder ? showTransferRoute : createOrder}
          disabled={creatingOrder}
          className="h-14 items-center justify-center rounded-2xl bg-brand"
        >
          {creatingOrder ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text variant="none" className="text-base font-bold text-white">
              {createdOrder ? "Show mock transfer route" : "Create order"}
            </Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
