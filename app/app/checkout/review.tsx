import { useEffect, useRef, useState } from "react";
import { AveraLoader } from "@/components/brand/AveraLoader";
import { CustomSelect } from "@/components/custom-select";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useColorScheme } from "nativewind";
import { Image, Pressable, ScrollView, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Text } from "@/components/themed/theme";
import { useToast } from "@/contexts/ToastContext";
import { BASE_URL, axiosInstance } from "@/utils/axios";
import { emitSocketAck } from "@/utils/socket-events";

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
  const [deliveryErrors, setDeliveryErrors] = useState<DeliveryErrors>({});
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
    checkoutStatusNotified?: string;
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

    if (!deliveryName.trim()) nextErrors.name = "Recipient name is required";
    if (!deliveryAddress.trim())
      nextErrors.address = "Delivery address is required";
    if (!deliveryCity.trim()) nextErrors.city = "City is required";
    if (!deliveryState.trim()) nextErrors.state = "State is required";
    if (!deliveryPhone.trim()) nextErrors.phone = "Phone number is required";

    setDeliveryErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const notifySeller = async (content: string) => {
    if (!params.conversationId) return;

    try {
      const response = await emitSocketAck<{
        ok?: boolean;
        message?: string | unknown;
      }>("message:send", "message:sent", {
        conversationId: Number(params.conversationId),
        content,
      });

      if (!response.ok || typeof response.message === "string") {
        throw new Error(
          typeof response.message === "string"
            ? response.message
            : "Message not sent",
        );
      }
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
      setDeliveryState(resolveStateValue(data.location?.state));
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
      const data = await emitSocketAck<{
        ok?: boolean;
        message?: string;
        order?: typeof createdOrder;
        orderStatus?: string;
      }>("payment:mock-transfer", "payment:mock-transfer:confirmed", {
        accountNumber: sellerAccount.accountNumber,
        amount: createdOrder.totalAmount,
        reference: createdOrder.code,
      });

      if (!data.ok) {
        throw new Error(data.message || "Payment failed");
      }

      setCreatedOrder((current) =>
        data.order
          ? data.order
          : current
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
          error?.message ||
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
        const data = await emitSocketAck<{
          ok?: boolean;
          message?: string;
          order?: any;
          paymentAccount?: any;
        }>("checkout:get-current", "checkout:current", {
          productId: Number(params.productId),
          conversationId: params.conversationId
            ? Number(params.conversationId)
            : undefined,
          offerMessageId: params.offerMessageId
            ? Number(params.offerMessageId)
            : undefined,
          source: isOfferCheckout ? "offer" : "buy_now",
        });

        if (!data.ok) {
          throw new Error(data.message || "Checkout unavailable");
        }
        if (!isMounted || !data.order) return;

        setCreatedOrder(data.order);
        setSellerAccount(data.paymentAccount);
        setDeliveryName(data.order.delivery?.name || "");
        setDeliveryPhone(data.order.delivery?.phone || "");
        setDeliveryAddress(data.order.delivery?.address || "");
        setDeliveryCity(data.order.delivery?.city || "");
        setDeliveryState(resolveStateValue(data.order.delivery?.state));
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
    if (params.checkoutStatusNotified === "true") {
      reviewStatusSentRef.current = true;
      return;
    }

    reviewStatusSentRef.current = true;
    notifySeller("Checkout status: Buyer is reviewing the order.");
  }, [params.checkoutStatusNotified, params.conversationId]);

  const createOrder = async () => {
    if (createdOrder) return payCreatedOrder();

    if (!params.productId) return;
    if (!validateDeliveryDetails()) {
      toast.show({
        title: "Delivery details required",
        description: "Add name, address, state, city, and phone number.",
        variant: "error",
      });
      return;
    }

    try {
      setCreatingOrder(true);
      setDeliveryErrors({});
      const data = await emitSocketAck<{
        ok?: boolean;
        message?: string;
        order?: any;
        paymentAccount?: any;
        existing?: boolean;
      }>("order:create", "order:created", {
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

      if (!data.ok || !data.order) {
        throw new Error(data.message || "We couldn't create this order.");
      }

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
          error?.message ||
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
                <AveraLoader size={24} compact />
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
              onChangeText={(value) => {
                setDeliveryName(value);
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
                setDeliveryAddress(value);
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
                setDeliveryCity(value);
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
                setDeliveryState(value);
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
                setDeliveryPhone(value);
                if (value.trim()) clearDeliveryError("phone");
              }}
              keyboardType="phone-pad"
              placeholder="Phone number"
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
            <AveraLoader size={24} color="#FFFFFF" compact />
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
