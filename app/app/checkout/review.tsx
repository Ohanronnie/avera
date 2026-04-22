import { useEffect, useRef, useState } from "react";
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
  const [payingOrder, setPayingOrder] = useState(false);
  const [autofillingDelivery, setAutofillingDelivery] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<{
    id: number;
    code: string;
    statusText: string;
    totalAmount: number;
  } | null>(null);
  const [deliveryName, setDeliveryName] = useState("");
  const [deliveryPhone, setDeliveryPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryCity, setDeliveryCity] = useState("");
  const [deliveryState, setDeliveryState] = useState("");
  const [deliveryAddressError, setDeliveryAddressError] = useState<
    string | null
  >(null);
  const reviewStatusSentRef = useRef(false);
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
  const isOrderPaid = createdOrder?.statusText === "Paid in escrow";
  const paymentReference = createdOrder?.code || null;
  const paymentAmount = createdOrder?.totalAmount || total;
  const transferUrl =
    sellerAccount && paymentReference
      ? `${BASE_URL}/send-money/${sellerAccount.accountNumber}/${paymentAmount}?reference=${encodeURIComponent(paymentReference)}`
      : sellerAccount
        ? `${BASE_URL}/send-money/${sellerAccount.accountNumber}/${paymentAmount}`
        : null;

  const getStatusText = (status?: string | null) => {
    if (status === "PAID_IN_ESCROW") return "Paid in escrow";
    if (status === "PENDING_TRANSFER") return "Pending transfer";
    return createdOrder?.statusText || "Order updated";
  };

  const notifySeller = async (content: string) => {
    if (!params.conversationId) return;

    try {
      await axiosInstance.post(
        `/chat/conversations/${params.conversationId}/messages`,
        { content },
      );
    } catch {
      // This is a status hint for the seller; checkout should continue if it fails.
    }
  };

  const fillDeliveryFromProfile = async () => {
    try {
      setAutofillingDelivery(true);
      const { data } = await axiosInstance.get("/users/me");
      const fullName =
        data.fullName ||
        [data.firstName, data.lastName].filter(Boolean).join(" ");
      setDeliveryName(fullName || "");
      setDeliveryPhone(data.phoneNumber || "");
      setDeliveryAddress(data.location?.address || "");
      setDeliveryCity(data.location?.city || "");
      setDeliveryState(data.location?.state || "");
      toast.show({
        title: fullName ? `Filled for ${fullName}` : "Delivery filled",
        description: "Review the address before creating the order.",
        variant: "success",
      });
    } catch {
      toast.show({
        title: "Couldn't autofill",
        description:
          "Complete your profile details or enter delivery manually.",
        variant: "error",
      });
    } finally {
      setAutofillingDelivery(false);
    }
  };

  const payCreatedOrder = async () => {
    if (!sellerAccount || !createdOrder) {
      toast.show({
        title: "Create order first",
        description: "The payment reference is created with the order.",
        variant: "info",
      });
      return;
    }

    try {
      setPayingOrder(true);
      const { data } = await axiosInstance.get(
        `/send-money/${sellerAccount.accountNumber}/${createdOrder.totalAmount}`,
        {
          params: { reference: createdOrder.code },
        },
      );

      setCreatedOrder((current) =>
        current
          ? {
              ...current,
              statusText: getStatusText(data.orderStatus),
            }
          : current,
      );
      toast.show({
        title: "Payment confirmed",
        description: `${createdOrder.code} is now tracked as paid in escrow.`,
        variant: "success",
      });
      notifySeller(
        `Checkout status: Payment confirmed for ${createdOrder.code}.`,
      );
    } catch (error: any) {
      toast.show({
        title: "Payment failed",
        description:
          error?.response?.data?.message ||
          "The dev transfer route could not confirm this order.",
        variant: "error",
      });
    } finally {
      setPayingOrder(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadCurrentCheckout = async () => {
      if (!params.productId) return;

      try {
        const { data } = await axiosInstance.get("/orders/checkout/current", {
          params: {
            productId: Number(params.productId),
            conversationId: params.conversationId
              ? Number(params.conversationId)
              : undefined,
            offerMessageId: params.offerMessageId
              ? Number(params.offerMessageId)
              : undefined,
            source: isOfferCheckout ? "offer" : "buy_now",
          },
        });
        if (!isMounted || !data.order) return;

        setCreatedOrder(data.order);
        setSellerAccount(data.paymentAccount);
        setDeliveryName(data.order.delivery?.name || "");
        setDeliveryPhone(data.order.delivery?.phone || "");
        setDeliveryAddress(data.order.delivery?.address || "");
        setDeliveryCity(data.order.delivery?.city || "");
        setDeliveryState(data.order.delivery?.state || "");
      } catch {
        if (isMounted) {
          setCreatedOrder(null);
          setSellerAccount(null);
        }
      }
    };

    loadCurrentCheckout();

    return () => {
      isMounted = false;
    };
  }, [
    isOfferCheckout,
    params.conversationId,
    params.offerMessageId,
    params.productId,
  ]);

  useEffect(() => {
    if (reviewStatusSentRef.current || !params.conversationId) return;

    reviewStatusSentRef.current = true;
    notifySeller("Checkout status: Buyer is reviewing the order.");
  }, [params.conversationId]);

  const createOrder = async () => {
    if (createdOrder) return payCreatedOrder();

    if (!params.productId) return;
    if (!deliveryAddress.trim()) {
      setDeliveryAddressError("Delivery address is required");
      toast.show({
        title: "Delivery address required",
        description: "Add where the seller should send the order.",
        variant: "error",
      });
      return;
    }

    try {
      setCreatingOrder(true);
      setDeliveryAddressError(null);
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
        deliveryName: deliveryName.trim() || undefined,
        deliveryPhone: deliveryPhone.trim() || undefined,
        deliveryAddress: deliveryAddress.trim() || undefined,
        deliveryCity: deliveryCity.trim() || undefined,
        deliveryState: deliveryState.trim() || undefined,
        deliveryCountry: "Nigeria",
      });

      setCreatedOrder(data.order);
      setSellerAccount(data.paymentAccount);
      toast.show({
        title: data.existing ? "Checkout resumed" : "Order ready",
        description: "Transfer the exact total to lock payment in escrow.",
        variant: "success",
      });
      notifySeller(`Checkout status: Buyer is paying for ${data.order.code}.`);
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
                  {createdOrder
                    ? "For now this is a mock transfer. Opening the test route will simulate a webhook and lock the money for this seller."
                    : "Bank details unlock after you confirm the delivery address and start payment."}
                </Text>
              </View>
            </View>

            {createdOrder ? (
              <View className="mt-4 rounded-2xl bg-gray-50 dark:bg-white/5">
                {[
                  {
                    label: "Bank",
                    value: sellerAccount?.bankName || "Loading",
                  },
                  {
                    label: "Account name",
                    value: sellerAccount?.accountName || sellerName,
                  },
                  {
                    label: "Account number",
                    value: sellerAccount?.accountNumber || "Generating",
                  },
                  { label: "Reference", value: createdOrder.code },
                  {
                    label: "Amount",
                    value: formatPrice(createdOrder.totalAmount),
                  },
                ].map((item, index, items) => (
                  <View
                    key={item.label}
                    className={`px-4 py-3 ${
                      index !== items.length - 1
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
            ) : null}

            {transferUrl && createdOrder ? (
              <Pressable
                onPress={payCreatedOrder}
                disabled={payingOrder || isOrderPaid}
                className="mt-4 rounded-2xl border border-dashed border-brand/30 bg-brand/5 p-3"
              >
                <Text
                  variant="none"
                  className="text-[10px] font-black uppercase tracking-widest text-brand"
                >
                  Dev transfer route with reference
                </Text>
                <Text className="mt-2 text-xs font-semibold leading-5 text-gray-600 dark:text-gray-300">
                  {transferUrl}
                </Text>
              </Pressable>
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
            <Pressable
              onPress={fillDeliveryFromProfile}
              disabled={autofillingDelivery}
              className="mb-3 h-11 flex-row items-center justify-center rounded-2xl border border-gray-100 bg-gray-50 dark:border-white/10 dark:bg-white/5"
            >
              {autofillingDelivery ? (
                <ActivityIndicator color="#2563EB" size="small" />
              ) : (
                <>
                  <Ionicons name="sparkles-outline" size={16} color="#2563EB" />
                  <Text
                    variant="none"
                    className="ml-2 text-sm font-bold text-brand"
                  >
                    Autofill from profile
                  </Text>
                </>
              )}
            </Pressable>
            <TextInput
              value={deliveryName}
              onChangeText={setDeliveryName}
              placeholder="Recipient name"
              placeholderTextColor="#9CA3AF"
              className="mb-3 h-14 rounded-2xl border border-gray-100 bg-gray-50 px-4 text-base text-gray-950 dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
            <TextInput
              value={deliveryAddress}
              onChangeText={(value) => {
                setDeliveryAddress(value);
                if (value.trim()) setDeliveryAddressError(null);
              }}
              placeholder="Delivery address"
              placeholderTextColor="#9CA3AF"
              className={`h-14 rounded-2xl border bg-gray-50 px-4 text-base text-gray-950 dark:bg-white/5 dark:text-white ${
                deliveryAddressError
                  ? "border-red-500"
                  : "border-gray-100 dark:border-white/10"
              }`}
            />
            {deliveryAddressError ? (
              <Text className="mb-3 mt-1 text-sm font-semibold text-red-500">
                {deliveryAddressError}
              </Text>
            ) : (
              <View className="mb-3" />
            )}
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
                {isOrderPaid
                  ? "Payment is confirmed and held in escrow."
                  : `${createdOrder.statusText}. Transfer the exact total to simulate payment confirmation.`}
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
              {
                label: "Delivery",
                value: deliveryAddress.trim() ? "Address added" : "Required",
              },
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
          onPress={createdOrder ? payCreatedOrder : createOrder}
          disabled={creatingOrder || payingOrder || isOrderPaid}
          className={`h-14 items-center justify-center rounded-2xl ${
            isOrderPaid ? "bg-emerald-500" : "bg-brand"
          }`}
        >
          {creatingOrder || payingOrder ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text variant="none" className="text-base font-bold text-white">
              {isOrderPaid
                ? "Payment confirmed"
                : createdOrder
                  ? "Pay with dev transfer"
                  : "Pay now"}
            </Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
