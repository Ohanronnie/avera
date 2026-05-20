import { useEffect, useRef, useState } from "react";
import { AveraLoader } from "@/components/brand/AveraLoader";
import { CustomSelect } from "@/components/custom-select";
import {
  ReviewOrderPayload,
  useAutofillProfileMutation,
  useCreateOrderMutation,
  useOrderReviewQuery,
} from "@/features/orders/hooks";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { useColorScheme } from "nativewind";
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Text } from "@/components/themed/theme";
import { useToast } from "@/contexts/ToastContext";
import { useAppStore } from "@/stores/app-store";
import { useCheckoutStore } from "@/stores/checkout-store";
import { connectSocket } from "@/utils/socket";

const parseNumber = (value?: string | string[], fallback = 1) => {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const numericValue = Number(rawValue);
  return Number.isFinite(numericValue) && numericValue > 0
    ? numericValue
    : fallback;
};

const formatPrice = (value: number) =>
  `₦${Number(value || 0).toLocaleString()}`;

const formatNigerianPhone = (value: string) => {
  const trimmedValue = value.trim();
  if (!trimmedValue) return { valid: false, e164: "" };

  try {
    const parsed =
      parsePhoneNumberFromString(trimmedValue, "NG") ||
      parsePhoneNumberFromString(trimmedValue);

    if (parsed?.isValid() && parsed.country === "NG") {
      return { valid: true, e164: parsed.number };
    }
  } catch {}

  return { valid: false, e164: "" };
};

const NIGERIAN_STATE_OPTIONS = [
  "Abia",
  "Adamawa",
  "Akwa Ibom",
  "Anambra",
  "Bauchi",
  "Bayelsa",
  "Benue",
  "Borno",
  "Cross River",
  "Delta",
  "Ebonyi",
  "Edo",
  "Ekiti",
  "Enugu",
  "FCT",
  "Gombe",
  "Imo",
  "Jigawa",
  "Kaduna",
  "Kano",
  "Katsina",
  "Kebbi",
  "Kogi",
  "Kwara",
  "Lagos",
  "Nasarawa",
  "Niger",
  "Ogun",
  "Ondo",
  "Osun",
  "Oyo",
  "Plateau",
  "Rivers",
  "Sokoto",
  "Taraba",
  "Yobe",
  "Zamfara",
].map((state) => ({ label: state, value: state }));

type DeliveryErrors = Partial<
  Record<"name" | "phone" | "address" | "city" | "state", string>
>;

const resolveStateValue = (value?: string | null) => {
  const trimmedValue = value?.trim() || "";
  const normalizedValue = trimmedValue.toLowerCase();
  const stateAliases: Record<string, string> = {
    abuja: "FCT",
    "federal capital territory": "FCT",
    "federal capital territory (fct)": "FCT",
  };
  const option = NIGERIAN_STATE_OPTIONS.find(
    (state) =>
      state.value.toLowerCase() === normalizedValue ||
      state.value === stateAliases[normalizedValue],
  );

  return option?.value || "";
};

export default function CheckoutReviewScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const toast = useToast();
  const isOnline = useAppStore((state) => state.isOnline);
  const checkoutDraft = useCheckoutStore((state) => state.draft);
  const updateCheckoutDraft = useCheckoutStore((state) => state.updateDraft);
  const hydrateCheckoutDraft = useCheckoutStore((state) => state.hydrateDraft);
  const [createdOrder, setCreatedOrder] = useState<{
    id: number;
    code: string;
    status: string;
    statusText: string;
    totalAmount: number;
  } | null>(null);
  const [deliveryErrors, setDeliveryErrors] = useState<DeliveryErrors>({});
  const reviewStatusSentRef = useRef(false);
  const params = useLocalSearchParams<{
    quantity?: string;
    conversationId?: string;
  }>();
  const conversationId = parseNumber(params.conversationId, 0);
  const {
    data: reviewData,
    isLoading: isReviewLoading,
    isRefetching: isRefetchingReview,
    refetch: refetchReview,
  } = useOrderReviewQuery(conversationId);
  const createOrderMutation = useCreateOrderMutation();
  const autofillProfileMutation = useAutofillProfileMutation();

  const resolvedProductId =
    reviewData?.productId || reviewData?.product?.id || 0;
  const resolvedSellerName = reviewData?.sellerName || "Avera seller";
  const resolvedProductName = reviewData?.product?.name || "Product listing";
  const resolvedProductImage = reviewData?.product?.images?.[0]?.url || "";
  const listedUnitPrice =
    reviewData?.product?.price != null ? Number(reviewData.product.price) : 0;
  const resolvedUnitPrice =
    reviewData?.offeredPrice != null
      ? Number(reviewData.offeredPrice)
      : reviewData?.product?.price != null
        ? Number(reviewData.product.price)
        : 0;
  const quantity = parseNumber(params.quantity);
  const availableQuantity = parseNumber(
    reviewData?.product?.quantity != null
      ? String(reviewData.product.quantity)
      : undefined,
    quantity,
  );
  const subtotal = resolvedUnitPrice * quantity;
  const escrowFee = Math.round(subtotal * 0.01);
  const total = subtotal + escrowFee;
  const isOfferCheckout =
    reviewData?.source === "offer" || reviewData?.offeredPrice != null;
  const isOrderPaid = createdOrder?.status === "PAID_IN_ESCROW";
  const deliveryName = checkoutDraft.deliveryName;
  const deliveryPhone = checkoutDraft.deliveryPhone;
  const deliveryAddress = checkoutDraft.deliveryAddress;
  const deliveryCity = checkoutDraft.deliveryCity;
  const deliveryState = checkoutDraft.deliveryState;

  const hasDeliveryDetails = [
    deliveryName,
    deliveryPhone,
    deliveryAddress,
    deliveryCity,
    deliveryState,
  ].every((value) => value.trim().length > 0);

  const clearDeliveryError = (field: keyof DeliveryErrors) => {
    setDeliveryErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const validateDeliveryDetails = () => {
    const nextErrors: DeliveryErrors = {};
    const normalizedPhone = formatNigerianPhone(deliveryPhone);

    if (!deliveryName.trim()) nextErrors.name = "Recipient name is required";
    if (!deliveryAddress.trim())
      nextErrors.address = "Delivery address is required";
    if (!deliveryCity.trim()) nextErrors.city = "City is required";
    if (!deliveryState.trim()) nextErrors.state = "State is required";
    if (!deliveryPhone.trim()) {
      nextErrors.phone = "Phone number is required";
    } else if (!normalizedPhone.valid) {
      nextErrors.phone = "Enter a valid Nigerian phone number";
    }

    setDeliveryErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const notifySeller = async (content: string) => {
    if (!params.conversationId) return;

    try {
      connectSocket().emit("conversation:message", {
        conversationId: Number(params.conversationId),
        content,
      });
    } catch {
      // This is a status hint for the seller; checkout should continue if it fails.
    }
  };

  useEffect(() => {
    hydrateCheckoutDraft({
      conversationId,
      quantity,
      productId: resolvedProductId || undefined,
      offerMessageId: reviewData?.offerMessageId || undefined,
      source: isOfferCheckout ? "OFFER" : "BUY_NOW",
      deliveryCountry: "Nigeria",
    });
  }, [
    conversationId,
    hydrateCheckoutDraft,
    isOfferCheckout,
    quantity,
    resolvedProductId,
    reviewData?.offerMessageId,
  ]);

  useEffect(() => {
    if (!reviewData) return;

    hydrateCheckoutDraft({
      deliveryName: checkoutDraft.deliveryName || reviewData.buyerName || "",
      deliveryAddress:
        checkoutDraft.deliveryAddress || reviewData.buyerAddress || "",
      deliveryCity: checkoutDraft.deliveryCity || reviewData.buyerCity || "",
      deliveryState:
        checkoutDraft.deliveryState || resolveStateValue(reviewData.buyerState),
    });
  }, [
    checkoutDraft.deliveryAddress,
    checkoutDraft.deliveryCity,
    checkoutDraft.deliveryName,
    checkoutDraft.deliveryState,
    hydrateCheckoutDraft,
    reviewData,
  ]);

  const fillDeliveryFromProfile = async () => {
    try {
      const data = await autofillProfileMutation.mutateAsync();
      const fullName =
        data.fullName ||
        [data.firstName, data.lastName].filter(Boolean).join(" ");
      hydrateCheckoutDraft({
        deliveryName: fullName || "",
        deliveryPhone: data.phoneNumber || "",
        deliveryAddress: data.location?.address || "",
        deliveryCity: data.location?.city || "",
        deliveryState: resolveStateValue(data.location?.state),
      });
      setDeliveryErrors({});
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
    }
  };

  useEffect(() => {
    if (reviewStatusSentRef.current || !conversationId) return;
    reviewStatusSentRef.current = true;
    notifySeller("Checkout status: Buyer is reviewing the order.");
  }, [conversationId]);

  const openPaymentScreen = (orderId: number) => {
    if (!params.conversationId) return;

    router.push({
      pathname: "/checkout/pay",
      params: {
        orderId: String(orderId),
        conversationId: String(params.conversationId),
        quantity: String(quantity),
      },
    });
  };

  const createOrder = async () => {
    if (!isOnline) {
      toast.show({
        title: "Connection required",
        description: "You need internet access to create this order.",
        variant: "error",
      });
      return;
    }

    if (createdOrder) {
      if (createdOrder.status === "PAID_IN_ESCROW") {
        router.push({
          pathname: "/order/[id]",
          params: { id: String(createdOrder.id) },
        });
        return;
      }
      openPaymentScreen(createdOrder.id);
      return;
    }

    if (!resolvedProductId) return;
    if (!validateDeliveryDetails()) {
      toast.show({
        title: "Delivery details required",
        description: "Add name, address, state, city, and phone number.",
        variant: "error",
      });
      return;
    }

    const normalizedPhone = formatNigerianPhone(deliveryPhone);
    if (!normalizedPhone.valid) return;

    try {
      setDeliveryErrors({});
      const data = await createOrderMutation.mutateAsync({
        productId: resolvedProductId,
        conversationId: conversationId || undefined,
        offerMessageId: reviewData?.offerMessageId || undefined,
        quantity,
        source: isOfferCheckout ? "OFFER" : "BUY_NOW",
        deliveryName: deliveryName.trim() || undefined,
        deliveryPhone: normalizedPhone.e164,
        deliveryAddress: deliveryAddress.trim() || undefined,
        deliveryCity: deliveryCity.trim() || undefined,
        deliveryState: deliveryState.trim() || undefined,
        deliveryCountry: "Nigeria",
      });

      if (!data.order) {
        throw new Error(data.message || "We couldn't create this order.");
      }

      setCreatedOrder(data.order);
      toast.show({
        title: data.existing ? "Checkout resumed" : "Order ready",
        description: "Continue to payment to complete this checkout.",
        variant: "success",
      });
      notifySeller(`Checkout status: Buyer is paying for ${data.order.code}.`);
      openPaymentScreen(data.order.id);
    } catch (error: any) {
      console.log(
        "Create order error",
        JSON.stringify(error.response, null, 2),
      );
      toast.show({
        title: "Order unavailable",
        description:
          error?.response?.data?.message ||
          error?.message ||
          "We couldn't create this order right now.",
        variant: "error",
      });
    }
  };

  const reviewLoading = isReviewLoading;
  const creatingOrder = createOrderMutation.isPending;
  const autofillingDelivery = autofillProfileMutation.isPending;

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
              Confirm the details before payment.
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetchingReview}
            onRefresh={() => {
              void refetchReview();
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
              <View className="mt-1 flex-row items-center">
                {isOfferCheckout && listedUnitPrice > 0 ? (
                  <Text className="text-sm font-semibold text-gray-400 line-through dark:text-gray-500">
                    {formatPrice(listedUnitPrice)}
                  </Text>
                ) : null}
                <Text
                  className={`${isOfferCheckout && listedUnitPrice > 0 ? "ml-2" : ""} text-sm font-semibold text-brand`}
                >
                  {formatPrice(resolvedUnitPrice)}
                </Text>
              </View>
              <Text className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Sold by {resolvedSellerName}
              </Text>
            </View>
          </View>

          {isOfferCheckout ? (
            <View className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
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

          <View className="mt-5 rounded-2xl border border-brand/20 bg-brand/10 p-4">
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

          <View className="mt-5 rounded-2xl border border-gray-100 bg-white p-4 dark:border-white/5 dark:bg-white/5">
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
              value={deliveryName}
              onChangeText={(value) => {
                updateCheckoutDraft({ deliveryName: value });
                if (value.trim()) clearDeliveryError("name");
              }}
              placeholder="Recipient name"
              placeholderTextColor="#9CA3AF"
              className={`h-14 rounded-2xl border bg-gray-50 px-4 text-base text-gray-950 dark:bg-white/5 dark:text-white ${
                deliveryErrors.name
                  ? "border-red-500"
                  : "border-gray-100 dark:border-white/10"
              }`}
            />
            {deliveryErrors.name ? (
              <Text className="mb-3 mt-1 text-sm font-semibold text-red-500">
                {deliveryErrors.name}
              </Text>
            ) : (
              <View className="mb-3" />
            )}
            <TextInput
              value={deliveryAddress}
              onChangeText={(value) => {
                updateCheckoutDraft({ deliveryAddress: value });
                if (value.trim()) clearDeliveryError("address");
              }}
              placeholder="Delivery address"
              placeholderTextColor="#9CA3AF"
              className={`h-14 rounded-2xl border bg-gray-50 px-4 text-base text-gray-950 dark:bg-white/5 dark:text-white ${
                deliveryErrors.address
                  ? "border-red-500"
                  : "border-gray-100 dark:border-white/10"
              }`}
            />
            {deliveryErrors.address ? (
              <Text className="mb-3 mt-1 text-sm font-semibold text-red-500">
                {deliveryErrors.address}
              </Text>
            ) : (
              <View className="mb-3" />
            )}
            <TextInput
              value={deliveryCity}
              onChangeText={(value) => {
                updateCheckoutDraft({ deliveryCity: value });
                if (value.trim()) clearDeliveryError("city");
              }}
              placeholder="City"
              placeholderTextColor="#9CA3AF"
              className={`h-14 rounded-2xl border bg-gray-50 px-4 text-base text-gray-950 dark:bg-white/5 dark:text-white ${
                deliveryErrors.city
                  ? "border-red-500"
                  : "border-gray-100 dark:border-white/10"
              }`}
            />
            {deliveryErrors.city ? (
              <Text className="mb-3 mt-1 text-sm font-semibold text-red-500">
                {deliveryErrors.city}
              </Text>
            ) : (
              <View className="mb-3" />
            )}
            <CustomSelect
              options={NIGERIAN_STATE_OPTIONS}
              selectedValue={deliveryState}
              onValueChange={(value) => {
                updateCheckoutDraft({ deliveryState: value });
                clearDeliveryError("state");
              }}
              placeholder="State"
              searchable
              searchPlaceholder="Search state"
              dropdownMaxHeight={260}
              className="z-20"
              triggerClassName={
                deliveryErrors.state
                  ? "border-red-500"
                  : "border-gray-100 dark:border-white/10"
              }
            />
            {deliveryErrors.state ? (
              <Text className="mb-3 mt-1 text-sm font-semibold text-red-500">
                {deliveryErrors.state}
              </Text>
            ) : (
              <View className="mb-3" />
            )}
            <TextInput
              value={deliveryPhone}
              onChangeText={(value) => {
                updateCheckoutDraft({ deliveryPhone: value });
                if (value.trim() && formatNigerianPhone(value).valid) {
                  clearDeliveryError("phone");
                }
              }}
              keyboardType="phone-pad"
              placeholder="Phone number (Nigeria)"
              placeholderTextColor="#9CA3AF"
              className={`h-14 rounded-2xl border bg-gray-50 px-4 text-base text-gray-950 dark:bg-white/5 dark:text-white ${
                deliveryErrors.phone
                  ? "border-red-500"
                  : "border-gray-100 dark:border-white/10"
              }`}
            />
            {deliveryErrors.phone ? (
              <Text className="mt-1 text-sm font-semibold text-red-500">
                {deliveryErrors.phone}
              </Text>
            ) : null}
          </View>

          {createdOrder ? (
            <View className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
              <Text
                variant="none"
                className="text-xs font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400"
              >
                Order created
              </Text>
              <Text className="mt-2 text-2xl font-semibold text-gray-950 dark:text-white">
                {createdOrder.code}
              </Text>
              <Text className="mt-1 text-sm font-semibold text-gray-600 dark:text-gray-300">
                {isOrderPaid
                  ? "Payment is confirmed and held in escrow."
                  : `${createdOrder.statusText}. Continue to payment when you're ready.`}
              </Text>
            </View>
          ) : null}

          <View className="mt-5 rounded-2xl border border-gray-100 bg-white p-4 dark:border-white/5 dark:bg-white/5">
            {[
              { label: "Unit price", value: formatPrice(resolvedUnitPrice) },
              { label: "Quantity", value: `x${quantity}` },
              { label: "Subtotal", value: formatPrice(subtotal) },
              { label: "Escrow fee", value: formatPrice(escrowFee) },
              {
                label: "Delivery",
                value: hasDeliveryDetails ? "Details added" : "Required",
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
                <Text className="text-2xl font-semibold text-brand">
                  {formatPrice(total)}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {reviewLoading ? (
        <View className="absolute inset-x-0 top-[76px] bottom-[88px] items-center justify-center bg-white/55 dark:bg-[#0A0A0A]/60">
          <AveraLoader label="Loading order details" />
        </View>
      ) : null}

      <View className="border-t border-gray-100 bg-white px-5 pb-6 pt-4 dark:border-white/5 dark:bg-[#0A0A0A]">
        <Pressable
          onPress={createOrder}
          disabled={reviewLoading || creatingOrder || isOrderPaid}
          className={`h-14 items-center justify-center rounded-2xl ${
            reviewLoading
              ? "bg-brand/60"
              : isOrderPaid
                ? "bg-emerald-500"
                : "bg-brand"
          }`}
        >
          {reviewLoading ? (
            <AveraLoader size={24} color="#FFFFFF" compact />
          ) : creatingOrder ? (
            <AveraLoader size={24} color="#FFFFFF" compact />
          ) : (
            <Text variant="none" className="text-base font-bold text-white">
              {isOrderPaid
                ? "View order"
                : createdOrder
                  ? "Continue paying"
                  : "Pay now"}
            </Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
