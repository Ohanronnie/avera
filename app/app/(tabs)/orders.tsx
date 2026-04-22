import { Text } from "@/components/themed/theme";
import { axiosInstance } from "@/utils/axios";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useColorScheme } from "nativewind";
import { ComponentProps, useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type IconName = ComponentProps<typeof Ionicons>["name"];
type OrderMode = "buying" | "selling";
type OrderStatus = "active" | "completed" | "cancelled";

type Order = {
  id: number;
  code: string;
  mode: OrderMode;
  productId: number;
  conversationId?: number | null;
  status: string;
  statusText: string;
  step: string;
  escrowState: string;
  unitPrice: number;
  quantity: number;
  totalAmount: number;
  updatedAt: string;
  product: {
    id: number;
    name: string;
    imageUrl?: string | null;
  };
  counterparty: {
    id: number;
    name: string;
    role: string;
  };
};

const statusFilters: Array<{ label: string; value: OrderStatus }> = [
  { label: "Active", value: "active" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

const formatPrice = (value: number) => `₦${value.toLocaleString()}`;
const formatUpdatedAt = (value: string) =>
  new Date(value).toLocaleDateString([], { month: "short", day: "numeric" });

const getStatusGroup = (status: string): OrderStatus => {
  if (status === "COMPLETED") return "completed";
  if (status === "CANCELLED") return "cancelled";
  return "active";
};

const getTimeline = (status: string) => {
  const paid = status !== "PENDING_TRANSFER" && status !== "CANCELLED";
  const shipped = ["SHIPPED", "DELIVERED", "COMPLETED"].includes(status);
  const completed = status === "COMPLETED";

  return [
    { label: "Paid", done: paid },
    { label: "Ship", done: shipped },
    { label: "Done", done: completed },
  ];
};

const getStatusTone = (status: OrderStatus) => {
  if (status === "completed") {
    return {
      icon: "checkmark-circle" as IconName,
      bg: "bg-emerald-500/10",
      text: "text-emerald-600 dark:text-emerald-400",
      dot: "bg-emerald-500",
    };
  }

  if (status === "cancelled") {
    return {
      icon: "close-circle" as IconName,
      bg: "bg-red-500/10",
      text: "text-red-500",
      dot: "bg-red-500",
    };
  }

  return {
    icon: "shield-checkmark" as IconName,
    bg: "bg-brand/10",
    text: "text-brand",
    dot: "bg-brand",
  };
};

export default function OrdersScreen() {
  const [activeMode, setActiveMode] = useState<OrderMode>("buying");
  const [activeStatus, setActiveStatus] = useState<OrderStatus>("active");
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      axiosInstance
        .get("/chat/conversations/unread-count")
        .then(({ data }) => {
          if (isMounted) setUnreadMessages(Number(data.count || 0));
        })
        .catch(() => {
          if (isMounted) setUnreadMessages(0);
        });

      setLoadingOrders(true);
      axiosInstance
        .get("/orders")
        .then(({ data }) => {
          if (isMounted) setOrders(data);
        })
        .catch(() => {
          if (isMounted) setOrders([]);
        })
        .finally(() => {
          if (isMounted) setLoadingOrders(false);
        });

      return () => {
        isMounted = false;
      };
    }, []),
  );

  const filteredOrders = useMemo(
    () =>
      orders.filter(
        (order) =>
          order.mode === activeMode &&
          getStatusGroup(order.status) === activeStatus,
      ),
    [activeMode, activeStatus],
  );

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#0A0A0A]" edges={["top"]}>
      <View className="border-b border-gray-100 bg-white px-5 py-4 dark:border-white/5 dark:bg-[#0A0A0A]">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-2xl font-bold text-gray-900 dark:text-white">
              Orders
            </Text>
          </View>

          <Pressable
            onPress={() => router.push("/messages")}
            className="relative h-11 w-11 items-center justify-center rounded-full border border-gray-100 bg-gray-50 dark:border-white/10 dark:bg-white/5"
          >
            <Ionicons
              name="chatbubbles-outline"
              size={21}
              color={isDark ? "white" : "#111827"}
            />
            {unreadMessages ? (
              <View className="absolute -right-1 -top-1 min-w-5 items-center justify-center rounded-full bg-brand px-1.5 py-0.5">
                <Text
                  variant="none"
                  className="text-[10px] font-black text-white"
                >
                  {unreadMessages > 9 ? "9+" : unreadMessages}
                </Text>
              </View>
            ) : null}
          </Pressable>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-5 pb-28 pt-5">
          <View className="flex-row rounded-xl bg-gray-100 p-1 dark:bg-white/5">
            {[
              { label: "Buying", value: "buying" as const },
              { label: "Selling", value: "selling" as const },
            ].map((mode) => (
              <Pressable
                key={mode.value}
                onPress={() => setActiveMode(mode.value)}
                className={`h-11 flex-1 items-center justify-center rounded-xl ${
                  activeMode === mode.value ? "bg-white dark:bg-white/10" : ""
                }`}
              >
                <Text
                  className={`text-sm font-bold ${
                    activeMode === mode.value
                      ? "text-gray-950 dark:text-white"
                      : "text-gray-500 dark:text-gray-400"
                  }`}
                >
                  {mode.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mt-4"
          >
            <View className="flex-row gap-2">
              {statusFilters.map((filter) => (
                <Pressable
                  key={filter.value}
                  onPress={() => setActiveStatus(filter.value)}
                  className={`rounded-full border px-4 py-2 ${
                    activeStatus === filter.value
                      ? "border-brand bg-brand"
                      : "border-gray-100 bg-white dark:border-white/5 dark:bg-white/5"
                  }`}
                >
                  <Text
                    variant="none"
                    className={`text-sm font-bold ${
                      activeStatus === filter.value
                        ? "text-white"
                        : "text-gray-500 dark:text-gray-300"
                    }`}
                  >
                    {filter.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          {loadingOrders ? (
            <View className="items-center justify-center py-24">
              <ActivityIndicator color="#2563EB" />
              <Text className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                Loading orders...
              </Text>
            </View>
          ) : filteredOrders.length ? (
            <View className="mt-5">
              {filteredOrders.map((order) => {
                const statusGroup = getStatusGroup(order.status);
                const tone = getStatusTone(statusGroup);
                const timeline = getTimeline(order.status);

                return (
                  <Pressable
                    key={order.id}
                    className="mb-4 rounded-3xl border border-gray-100 bg-white p-4 dark:border-white/5 dark:bg-[#1A1A1A]"
                  >
                    <View className="flex-row">
                      <Image
                        source={
                          order.product.imageUrl
                            ? { uri: order.product.imageUrl }
                            : require("@/assets/images/shoe.jpg")
                        }
                        className="h-20 w-20 rounded-2xl bg-gray-100 dark:bg-white/5"
                      />
                      <View className="ml-3 flex-1">
                        <View className="flex-row items-center justify-between">
                          <Text className="text-xs font-bold uppercase tracking-widest text-gray-400">
                            {order.code}
                          </Text>
                          <View
                            className={`flex-row items-center rounded-full px-2.5 py-1 ${tone.bg}`}
                          >
                            <View
                              className={`mr-1.5 h-1.5 w-1.5 rounded-full ${tone.dot}`}
                            />
                            <Text
                              variant="none"
                              className={`text-[10px] font-black uppercase ${tone.text}`}
                            >
                              {order.statusText}
                            </Text>
                          </View>
                        </View>
                        <Text
                          className="mt-1 text-base font-bold text-gray-950 dark:text-white"
                          numberOfLines={2}
                        >
                          {order.product.name}
                        </Text>
                        <Text className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {order.counterparty.role}: {order.counterparty.name}
                        </Text>
                      </View>
                    </View>

                    <View className="mt-4 flex-row items-center justify-between border-t border-gray-100 pt-4 dark:border-white/5">
                      <View>
                        <Text className="text-xs text-gray-500 dark:text-gray-400">
                          Total
                        </Text>
                        <Text className="mt-1 text-lg font-black text-gray-950 dark:text-white">
                          {formatPrice(order.totalAmount)}
                        </Text>
                      </View>
                      <View className="items-end">
                        <Text className="text-xs text-gray-500 dark:text-gray-400">
                          Updated
                        </Text>
                        <Text className="mt-1 text-sm font-bold text-gray-950 dark:text-white">
                          {formatUpdatedAt(order.updatedAt)}
                        </Text>
                      </View>
                    </View>

                    <View className="mt-4 border-t border-gray-100 pt-4 dark:border-white/5">
                      <View className="flex-row items-center">
                        <Ionicons
                          name={tone.icon}
                          size={17}
                          color={
                            statusGroup === "active"
                              ? "#2563EB"
                              : statusGroup === "completed"
                                ? "#10B981"
                                : "#EF4444"
                          }
                        />
                        <Text className="ml-2 flex-1 text-sm font-bold text-gray-950 dark:text-white">
                          {order.step}
                        </Text>
                      </View>
                      <Text className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {order.escrowState}
                      </Text>
                    </View>

                    <View className="mt-4 flex-row items-center">
                      {timeline.map((item, index) => (
                        <View
                          key={item.label}
                          className="flex-1 flex-row items-center"
                        >
                          <View
                            className={`h-6 w-6 items-center justify-center rounded-full ${
                              item.done
                                ? "bg-brand"
                                : "bg-gray-100 dark:bg-white/10"
                            }`}
                          >
                            <Ionicons
                              name={item.done ? "checkmark" : "ellipse-outline"}
                              size={13}
                              color={
                                item.done
                                  ? "white"
                                  : isDark
                                    ? "#9CA3AF"
                                    : "#6B7280"
                              }
                            />
                          </View>
                          {index < timeline.length - 1 && (
                            <View
                              className={`mx-2 h-0.5 flex-1 rounded-full ${
                                item.done
                                  ? "bg-brand"
                                  : "bg-gray-100 dark:bg-white/10"
                              }`}
                            />
                          )}
                        </View>
                      ))}
                    </View>
                    <View className="mt-2 flex-row justify-between">
                      {timeline.map((item) => (
                        <Text
                          key={item.label}
                          className="text-[10px] font-bold uppercase text-gray-400"
                        >
                          {item.label}
                        </Text>
                      ))}
                    </View>

                    <View className="mt-4 flex-row gap-3">
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
                          View Item
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
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <View className="items-center justify-center px-5 py-24">
              <View className="mb-6 h-24 w-24 items-center justify-center rounded-full bg-gray-50 dark:bg-white/5">
                <Ionicons
                  name="receipt-outline"
                  size={40}
                  color={isDark ? "#4B5563" : "#9CA3AF"}
                />
              </View>
              <Text className="text-center text-xl font-bold text-gray-900 dark:text-white">
                No {activeStatus} orders
              </Text>
              <Text className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">
                {activeMode === "buying"
                  ? "Items you buy will show up here once checkout starts."
                  : "Orders from buyers will appear here when your listings sell."}
              </Text>
              <Pressable
                onPress={() =>
                  router.push(
                    activeMode === "buying"
                      ? "/(tabs)/home"
                      : "/product/create",
                  )
                }
                className="mt-8 rounded-2xl bg-brand px-8 py-4"
              >
                <Text variant="none" className="font-bold text-white">
                  {activeMode === "buying" ? "Browse Products" : "List an Item"}
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
