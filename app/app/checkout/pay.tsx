import { useEffect, useMemo, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  CheckoutOrder,
  ReviewOrderPayload,
  useCheckoutSessionMutation,
  useOrderDetailQuery,
  useOrderReviewQuery,
} from "@/features/orders/hooks";
import { router, useLocalSearchParams } from "expo-router";
import { useColorScheme } from "nativewind";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

import { AveraLoader } from "@/components/brand/AveraLoader";
import { Text } from "@/components/themed/theme";
import { useToast } from "@/contexts/ToastContext";
import { useAppStore } from "@/stores/app-store";
import { useCheckoutStore } from "@/stores/checkout-store";
import { BASE_URL } from "@/utils/axios";
import { connectSocket } from "@/utils/socket";

const parseNumber = (value?: string | string[], fallback = 0) => {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const numericValue = Number(rawValue);
  return Number.isFinite(numericValue) && numericValue > 0
    ? numericValue
    : fallback;
};

const formatPrice = (value: number) =>
  `₦${Number(value || 0).toLocaleString()}`;

const cancelUrlPrefix = `${BASE_URL}/cancel`;
const successUrlPrefix = `${BASE_URL}/success`;

export default function CheckoutPayScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const toast = useToast();
  const isOnline = useAppStore((state) => state.isOnline);
  const hydrateCheckoutDraft = useCheckoutStore((state) => state.hydrateDraft);
  const params = useLocalSearchParams<{
    orderId?: string;
    quantity?: string;
    conversationId?: string;
  }>();

  const orderId = parseNumber(params.orderId);
  const fallbackQuantity = parseNumber(params.quantity, 1);
  const [checkoutModalVisible, setCheckoutModalVisible] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const payingStatusSentRef = useRef(false);
  const conversationId = parseNumber(params.conversationId, 0);
  const {
    data: orderData,
    isLoading: isOrderLoading,
    isRefetching: isRefetchingOrder,
    refetch: refetchOrder,
  } = useOrderDetailQuery(orderId);
  const {
    data: reviewData,
    isRefetching: isRefetchingReview,
    refetch: refetchReview,
  } = useOrderReviewQuery(conversationId);
  const checkoutSessionMutation = useCheckoutSessionMutation();
  const order = orderData
    ? ({
        ...orderData,
        delivery: orderData.delivery || undefined,
      } as CheckoutOrder)
    : null;

  const resolvedQuantity = order?.quantity || fallbackQuantity;
  const resolvedProductName = reviewData?.product?.name || "Product listing";
  const resolvedProductImage = reviewData?.product?.images?.[0]?.url || "";
  const resolvedSellerName = reviewData?.sellerName || "Avera seller";
  const resolvedUnitPrice =
    reviewData?.offeredPrice != null
      ? Number(reviewData.offeredPrice)
      : reviewData?.product?.price != null
        ? Number(reviewData.product.price)
        : 0;
  const subtotal = useMemo(
    () => resolvedUnitPrice * resolvedQuantity,
    [resolvedQuantity, resolvedUnitPrice],
  );
  const escrowFee = useMemo(() => Math.round(subtotal * 0.01), [subtotal]);
  const total = order?.totalAmount || subtotal + escrowFee;
  const isOrderPaid = order?.status === "PAID_IN_ESCROW";

  useEffect(() => {
    hydrateCheckoutDraft({
      conversationId: conversationId || undefined,
      quantity: resolvedQuantity,
      deliveryName: order?.delivery?.name || "",
      deliveryPhone: order?.delivery?.phone || "",
      deliveryAddress: order?.delivery?.address || "",
      deliveryCity: order?.delivery?.city || "",
      deliveryState: order?.delivery?.state || "",
      deliveryCountry: order?.delivery?.country || "Nigeria",
    });
  }, [
    conversationId,
    hydrateCheckoutDraft,
    order?.delivery?.address,
    order?.delivery?.city,
    order?.delivery?.country,
    order?.delivery?.name,
    order?.delivery?.phone,
    order?.delivery?.state,
    resolvedQuantity,
  ]);

  const notifyCheckoutStatus = (content: string) => {
    if (!conversationId) return;

    try {
      connectSocket().emit("conversation:message", {
        conversationId,
        content,
      });
    } catch {}
  };

  useEffect(() => {
    if (
      !order?.code ||
      order.status !== "PENDING_TRANSFER" ||
      payingStatusSentRef.current
    ) {
      return;
    }

    payingStatusSentRef.current = true;
    notifyCheckoutStatus(`Checkout status: Buyer is paying for ${order.code}.`);
  }, [order?.code, order?.status]);

  const closeCheckoutModal = () => {
    setCheckoutModalVisible(false);
    setCheckoutUrl(null);
  };

  const startCheckout = async () => {
    if (!isOnline) {
      toast.show({
        title: "Connection required",
        description: "You need internet access to continue with payment.",
        variant: "error",
      });
      return;
    }

    if (!orderId) return;

    try {
      const data = await checkoutSessionMutation.mutateAsync(orderId);

      if (data.alreadyPaid || !data.authorizationUrl) {
        toast.show({
          title: "Payment already confirmed",
          description: "This order is already held in escrow.",
          variant: "success",
        });
        closeCheckoutModal();
        return;
      }

      setCheckoutUrl(data.authorizationUrl);
    } catch (error: any) {
      toast.show({
        title: "Couldn't start checkout",
        description:
          error?.response?.data?.message ||
          error?.message ||
          "Try again in a moment.",
        variant: "error",
      });
    }
  };

  const handleCheckoutState = (url?: string | null) => {
    if (!url) return false;

    if (url.startsWith(cancelUrlPrefix)) {
      closeCheckoutModal();
      toast.show({
        title: "Checkout cancelled",
        description: "You can continue again whenever you're ready.",
        variant: "success",
      });
      return true;
    }

    if (url.startsWith(successUrlPrefix)) {
      closeCheckoutModal();
      router.replace({
        pathname: "/checkout/success",
        params: {
          orderId: String(orderId),
        },
      });
      return true;
    }

    return false;
  };

  if (isOrderLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-[#0A0A0A]">
        <AveraLoader label="Loading checkout" />
      </View>
    );
  }

  if (!order) {
    return (
      <SafeAreaView
        className="flex-1 bg-white dark:bg-[#0A0A0A]"
        edges={["top"]}
      >
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-lg font-semibold text-gray-950 dark:text-white">
            This checkout is no longer available.
          </Text>
          <Pressable
            onPress={() => router.back()}
            className="mt-5 h-12 items-center justify-center rounded-full bg-brand px-6"
          >
            <Text variant="none" className="font-semibold text-white">
              Back
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

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
              Checkout
            </Text>
            <Text className="mt-0.5 text-xs font-medium text-gray-500 dark:text-gray-400">
              Complete payment to lock funds in escrow.
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetchingOrder || isRefetchingReview}
            onRefresh={() => {
              void Promise.all([refetchOrder(), refetchReview()]);
            }}
            tintColor="#2563EB"
          />
        }
      >
        <View className="px-5 pb-28 pt-5">
          <View className="flex-row rounded-2xl border border-gray-100 bg-gray-50 p-3 dark:border-white/5 dark:bg-white/5">
            {resolvedProductImage ? (
              <Image
                source={{ uri: resolvedProductImage }}
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
                className="text-lg font-semibold text-gray-950 dark:text-white"
              >
                {resolvedProductName}
              </Text>
              <Text className="mt-1 text-sm font-semibold text-brand">
                {formatPrice(resolvedUnitPrice)}
              </Text>
              <Text className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Sold by {resolvedSellerName}
              </Text>
            </View>
          </View>

          <View className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
            <Text
              variant="none"
              className="text-xs font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400"
            >
              Order ready
            </Text>
            <Text className="mt-2 text-2xl font-semibold text-gray-950 dark:text-white">
              {order.code}
            </Text>
            <Text className="mt-1 text-sm font-semibold text-gray-600 dark:text-gray-300">
              {isOrderPaid
                ? "Payment is confirmed and held in escrow."
                : `${order.statusText}. Continue to checkout when you're ready.`}
            </Text>
          </View>

          <View className="mt-5 rounded-2xl border border-gray-100 bg-white p-4 dark:border-white/5 dark:bg-white/5">
            {[
              { label: "Unit price", value: formatPrice(resolvedUnitPrice) },
              { label: "Quantity", value: `x${resolvedQuantity}` },
              { label: "Subtotal", value: formatPrice(subtotal) },
              { label: "Escrow fee", value: formatPrice(escrowFee) },
              { label: "Total", value: formatPrice(total) },
            ].map((item, index) => (
              <View
                key={item.label}
                className={`flex-row items-center justify-between ${
                  index !== 4 ? "mb-3" : ""
                }`}
              >
                <Text className="text-sm text-gray-500 dark:text-gray-400">
                  {item.label}
                </Text>
                <Text className="text-sm font-bold text-gray-950 dark:text-white">
                  {item.value}
                </Text>
              </View>
            ))}
          </View>

          {order.delivery ? (
            <View className="mt-5 rounded-2xl border border-gray-100 bg-white p-4 dark:border-white/5 dark:bg-white/5">
              <Text className="text-base font-bold text-gray-950 dark:text-white">
                Delivery details
              </Text>
              <Text className="mt-3 text-sm text-gray-600 dark:text-gray-300">
                {order.delivery.name}
              </Text>
              <Text className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                {order.delivery.phone}
              </Text>
              <Text className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                {order.delivery.address}
              </Text>
              <Text className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                {order.delivery.city}, {order.delivery.state}
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <View className="border-t border-gray-100 bg-white px-5 pb-6 pt-4 dark:border-white/5 dark:bg-[#0A0A0A]">
        <Pressable
          onPress={() => {
            setCheckoutUrl(null);
            setCheckoutModalVisible(true);
          }}
          disabled={isOrderPaid}
          className={`h-14 items-center justify-center rounded-2xl ${
            isOrderPaid ? "bg-emerald-500" : "bg-brand"
          }`}
        >
          <Text variant="none" className="text-base font-bold text-white">
            {isOrderPaid ? "Payment confirmed" : "Pay now"}
          </Text>
        </Pressable>
      </View>

      <Modal
        visible={checkoutModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeCheckoutModal}
      >
        <SafeAreaView
          className="flex-1 bg-white dark:bg-[#0A0A0A]"
          edges={["top"]}
        >
          <View className="border-b border-gray-100 px-5 py-4 dark:border-white/5">
            <View className="flex-row items-center justify-between">
              <Text className="text-xl font-bold text-gray-950 dark:text-white">
                Secure checkout
              </Text>
              <Pressable
                onPress={closeCheckoutModal}
                className="h-10 w-10 items-center justify-center rounded-full border border-gray-100 bg-gray-50 dark:border-white/10 dark:bg-white/5"
              >
                <Ionicons
                  name="close"
                  size={20}
                  color={isDark ? "white" : "#111827"}
                />
              </Pressable>
            </View>
          </View>

          {checkoutUrl ? (
            <WebView
              source={{ uri: checkoutUrl }}
              startInLoadingState
              renderLoading={() => (
                <View className="flex-1 items-center justify-center bg-white dark:bg-[#0A0A0A]">
                  <ActivityIndicator size="large" color="#2563EB" />
                </View>
              )}
              onNavigationStateChange={(state) => {
                handleCheckoutState(state.url);
              }}
              onShouldStartLoadWithRequest={(request) => {
                if (handleCheckoutState(request.url)) {
                  return false;
                }
                return true;
              }}
              onMessage={(event) => {
                if (event.nativeEvent.data === "cancelled") {
                  handleCheckoutState(cancelUrlPrefix);
                }
                if (event.nativeEvent.data === "success") {
                  handleCheckoutState(successUrlPrefix);
                }
              }}
            />
          ) : (
            <View className="flex-1 px-5 py-6">
              <View className="rounded-3xl border border-gray-100 bg-gray-50 p-5 dark:border-white/5 dark:bg-white/5">
                <Text className="text-lg font-semibold text-gray-950 dark:text-white">
                  Ready to continue?
                </Text>
                <Text className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
                  We’ll open Paystack in a secure checkout view. If you cancel
                  there or here, the modal will close and your order will stay
                  pending until you try again.
                </Text>

                <View className="mt-5 rounded-2xl bg-white p-4 dark:bg-[#0F0F10]">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm text-gray-500 dark:text-gray-400">
                      Order
                    </Text>
                    <Text className="text-sm font-semibold text-gray-950 dark:text-white">
                      {order.code}
                    </Text>
                  </View>
                  <View className="mt-3 flex-row items-center justify-between">
                    <Text className="text-sm text-gray-500 dark:text-gray-400">
                      Amount
                    </Text>
                    <Text className="text-sm font-semibold text-brand">
                      {formatPrice(order.totalAmount)}
                    </Text>
                  </View>
                </View>

                <Pressable
                  onPress={startCheckout}
                  disabled={checkoutSessionMutation.isPending}
                  className="mt-5 h-14 items-center justify-center rounded-full bg-brand"
                >
                  {checkoutSessionMutation.isPending ? (
                    <AveraLoader size={22} color="#FFFFFF" compact />
                  ) : (
                    <Text
                      variant="none"
                      className="text-base font-bold text-white"
                    >
                      Continue to checkout
                    </Text>
                  )}
                </Pressable>
              </View>
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
