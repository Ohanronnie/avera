import { AveraLoader } from "@/components/brand/AveraLoader";
import {
  OrderDetail,
  useOrderDetailQuery,
  useUpdateOrderStatusMutation,
} from "@/features/orders/hooks";
import { Text } from "@/components/themed/theme";
import { useToast } from "@/contexts/ToastContext";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useColorScheme } from "nativewind";
import { ComponentProps, useMemo } from "react";
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type IconName = ComponentProps<typeof Ionicons>["name"];

const formatPrice = (value: number) =>
  `₦${Number(value || 0).toLocaleString()}`;

const statusSteps = [
  {
    label: "Paid",
    statuses: [
      "PAID_IN_ESCROW",
      "SELLER_PREPARING",
      "SHIPPED",
      "DELIVERED",
      "COMPLETED",
    ],
  },
  {
    label: "Preparing",
    statuses: ["SELLER_PREPARING", "SHIPPED", "DELIVERED", "COMPLETED"],
  },
  { label: "Shipped", statuses: ["SHIPPED", "DELIVERED", "COMPLETED"] },
  { label: "Received", statuses: ["COMPLETED"] },
];

const getAction = (order: OrderDetail | null) => {
  if (!order) return null;

  if (order.mode === "selling") {
    if (order.status === "PAID_IN_ESCROW") {
      return {
        action: "prepare" as const,
        label: "Mark preparing",
        icon: "construct-outline" as IconName,
      };
    }
    if (order.status === "SELLER_PREPARING") {
      return {
        action: "ship" as const,
        label: "Mark shipped",
        icon: "paper-plane-outline" as IconName,
      };
    }
    if (order.status === "SHIPPED") {
      return {
        action: "deliver" as const,
        label: "Mark delivered",
        icon: "checkmark-done-outline" as IconName,
      };
    }
  }

  if (order.mode === "buying" && order.status === "DELIVERED") {
    return {
      action: "received" as const,
      label: "I received it",
      icon: "checkmark-circle-outline" as IconName,
    };
  }

  return null;
};

export default function OrderDetailsScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const orderId = Number(params.id);
  const toast = useToast();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const {
    data: order,
    isLoading: loading,
    isRefetching,
    refetch,
  } = useOrderDetailQuery(orderId);
  const updateOrderStatusMutation = useUpdateOrderStatusMutation();

  const action = useMemo(() => getAction(order), [order]);

  const updateStatus = async () => {
    if (!order || !action) return;

    try {
      const data = await updateOrderStatusMutation.mutateAsync({
        orderId: order.id,
        action: action.action,
      });
      toast.show({
        title: "Order updated",
        description: data.step,
        variant: "success",
      });
    } catch (error: any) {
      toast.show({
        title: "Update failed",
        description:
          error?.response?.data?.message ||
          error?.message ||
          "This status update is not available right now.",
        variant: "error",
      });
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
              Order details
            </Text>
            <Text className="mt-0.5 text-xs font-medium text-gray-500 dark:text-gray-400">
              {order?.code || "Loading order"}
            </Text>
          </View>
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <AveraLoader label="Loading order" />
        </View>
      ) : order ? (
        <>
          <ScrollView
            className="flex-1"
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={() => {
                  void refetch();
                }}
                tintColor="#2563EB"
              />
            }
          >
            <View className="px-5 pb-28 pt-5">
              <View className="rounded-2xl border border-brand/20 bg-brand/10 p-4">
                <Text
                  variant="none"
                  className="text-xs font-semibold uppercase tracking-widest text-brand"
                >
                  {order.statusText}
                </Text>
                <Text className="mt-2 text-2xl font-semibold text-gray-950 dark:text-white">
                  {order.step}
                </Text>
                <Text className="mt-1 text-sm leading-5 text-gray-600 dark:text-gray-300">
                  {order.escrowState}
                </Text>
              </View>

              <View className="mt-5 flex-row rounded-2xl border border-gray-100 bg-white p-3 dark:border-white/5 dark:bg-white/5">
                <Image
                  source={
                    order.product.imageUrl
                      ? { uri: order.product.imageUrl }
                      : require("@/assets/images/shoe.jpg")
                  }
                  className="h-24 w-24 rounded-2xl bg-gray-100 dark:bg-white/5"
                />
                <View className="ml-3 flex-1 justify-center">
                  <Text
                    numberOfLines={2}
                    className="text-lg font-semibold text-gray-950 dark:text-white"
                  >
                    {order.product.name}
                  </Text>
                  <Text className="mt-1 text-sm font-semibold text-brand">
                    {formatPrice(order.totalAmount)}
                  </Text>
                  <Text className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {order.counterparty.role}: {order.counterparty.name}
                  </Text>
                </View>
              </View>

              <View className="mt-5 rounded-2xl border border-gray-100 bg-white p-4 dark:border-white/5 dark:bg-white/5">
                <Text className="mb-4 text-base font-bold text-gray-950 dark:text-white">
                  Progress
                </Text>
                {statusSteps.map((step, index) => {
                  const done = step.statuses.includes(order.status);
                  return (
                    <View key={step.label} className="flex-row">
                      <View className="items-center">
                        <View
                          className={`h-8 w-8 items-center justify-center rounded-full ${
                            done ? "bg-brand" : "bg-gray-100 dark:bg-white/10"
                          }`}
                        >
                          <Ionicons
                            name={done ? "checkmark" : "ellipse-outline"}
                            size={15}
                            color={done ? "white" : "#9CA3AF"}
                          />
                        </View>
                        {index < statusSteps.length - 1 ? (
                          <View
                            className={`h-8 w-0.5 ${
                              done ? "bg-brand" : "bg-gray-100 dark:bg-white/10"
                            }`}
                          />
                        ) : null}
                      </View>
                      <Text className="ml-3 pt-1 text-sm font-bold text-gray-950 dark:text-white">
                        {step.label}
                      </Text>
                    </View>
                  );
                })}
              </View>

              <View className="mt-5 rounded-2xl border border-gray-100 bg-white p-4 dark:border-white/5 dark:bg-white/5">
                <Text className="mb-3 text-base font-bold text-gray-950 dark:text-white">
                  Delivery
                </Text>
                {[
                  { label: "Name", value: order.delivery.name },
                  { label: "Phone", value: order.delivery.phone },
                  { label: "Address", value: order.delivery.address },
                  {
                    label: "City / State",
                    value: [order.delivery.city, order.delivery.state]
                      .filter(Boolean)
                      .join(", "),
                  },
                ].map((item) => (
                  <View
                    key={item.label}
                    className="border-b border-gray-100 py-3 last:border-b-0 dark:border-white/5"
                  >
                    <Text className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                      {item.label}
                    </Text>
                    <Text className="mt-1 text-sm font-bold text-gray-950 dark:text-white">
                      {item.value || "Not added"}
                    </Text>
                  </View>
                ))}
              </View>

              <View className="mt-5 rounded-2xl border border-gray-100 bg-white p-4 dark:border-white/5 dark:bg-white/5">
                {[
                  { label: "Unit price", value: formatPrice(order.unitPrice) },
                  { label: "Quantity", value: `x${order.quantity}` },
                  { label: "Subtotal", value: formatPrice(order.subtotal) },
                  { label: "Escrow fee", value: formatPrice(order.escrowFee) },
                  { label: "Total", value: formatPrice(order.totalAmount) },
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
              </View>

              <View className="mt-5 flex-row gap-3">
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: "/product-details/[id]",
                      params: { id: String(order.product.id) },
                    })
                  }
                  className="h-12 flex-1 items-center justify-center rounded-2xl border border-gray-100 bg-gray-50 dark:border-white/5 dark:bg-white/5"
                >
                  <Text className="font-bold text-gray-950 dark:text-white">
                    View item
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() =>
                    order.conversationId
                      ? router.push({
                          pathname: "/messages/[id]",
                          params: { id: String(order.conversationId) },
                        })
                      : router.push("/messages")
                  }
                  className="h-12 flex-1 items-center justify-center rounded-2xl bg-brand"
                >
                  <Text variant="none" className="font-bold text-white">
                    Message
                  </Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>

          {action ? (
            <View className="border-t border-gray-100 bg-white px-5 pb-6 pt-4 dark:border-white/5 dark:bg-[#0A0A0A]">
              <Pressable
                onPress={updateStatus}
                disabled={updateOrderStatusMutation.isPending}
                className="h-14 flex-row items-center justify-center rounded-2xl bg-brand"
              >
                {updateOrderStatusMutation.isPending ? (
                  <AveraLoader size={24} color="#FFFFFF" compact />
                ) : (
                  <>
                    <Ionicons name={action.icon} size={18} color="white" />
                    <Text
                      variant="none"
                      className="ml-2 text-base font-bold text-white"
                    >
                      {action.label}
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          ) : null}
        </>
      ) : (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="receipt-outline" size={42} color="#9CA3AF" />
          <Text className="mt-4 text-center text-xl font-bold text-gray-950 dark:text-white">
            Order not found
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}
