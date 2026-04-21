import { Text } from "@/components/themed/theme";
import { axiosInstance } from "@/utils/axios";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useColorScheme } from "nativewind";
import { ComponentProps, useCallback, useMemo, useState } from "react";
import { Image, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type IconName = ComponentProps<typeof Ionicons>["name"];
type OrderMode = "buying" | "selling";
type OrderStatus = "active" | "completed" | "cancelled";

type Order = {
  id: string;
  productId: number;
  productName: string;
  counterparty: string;
  counterpartyRole: string;
  price: number;
  quantity: number;
  status: OrderStatus;
  step: string;
  escrowState: string;
  updatedAt: string;
  imageUrl?: string;
  mode: OrderMode;
  timeline: Array<{
    label: string;
    done: boolean;
  }>;
};

const statusFilters: Array<{ label: string; value: OrderStatus }> = [
  { label: "Active", value: "active" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

const orders: Order[] = [
  {
    id: "AV-2034",
    productId: 7,
    productName: "iPhone 15 Pro Max 256GB",
    counterparty: "Daniel Okoro",
    counterpartyRole: "Seller",
    price: 1320000,
    quantity: 1,
    status: "active",
    step: "Awaiting seller handoff",
    escrowState: "Payment held in escrow",
    updatedAt: "Today, 10:42",
    imageUrl:
      "https://images.unsplash.com/photo-1695048133142-1a20484d2569?q=80&w=600&auto=format&fit=crop",
    mode: "buying",
    timeline: [
      { label: "Paid", done: true },
      { label: "Handoff", done: false },
      { label: "Confirm", done: false },
    ],
  },
  {
    id: "AV-2028",
    productId: 12,
    productName: "Sony WH-1000XM5 Headphones",
    counterparty: "Mira Ade",
    counterpartyRole: "Buyer",
    price: 385000,
    quantity: 1,
    status: "active",
    step: "Buyer requested delivery details",
    escrowState: "Waiting for buyer payment",
    updatedAt: "Yesterday, 18:08",
    imageUrl:
      "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?q=80&w=600&auto=format&fit=crop",
    mode: "selling",
    timeline: [
      { label: "Accepted", done: true },
      { label: "Payment", done: false },
      { label: "Ship", done: false },
    ],
  },
  {
    id: "AV-1982",
    productId: 4,
    productName: "Nike Air Max Pulse",
    counterparty: "Tomi Balogun",
    counterpartyRole: "Seller",
    price: 92000,
    quantity: 1,
    status: "completed",
    step: "Order completed",
    escrowState: "Funds released",
    updatedAt: "Apr 18, 2026",
    imageUrl:
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=600&auto=format&fit=crop",
    mode: "buying",
    timeline: [
      { label: "Paid", done: true },
      { label: "Received", done: true },
      { label: "Released", done: true },
    ],
  },
  {
    id: "AV-1905",
    productId: 21,
    productName: "Logitech MX Master 3S",
    counterparty: "Chinedu N.",
    counterpartyRole: "Buyer",
    price: 76000,
    quantity: 2,
    status: "cancelled",
    step: "Cancelled before payment",
    escrowState: "No funds captured",
    updatedAt: "Apr 12, 2026",
    imageUrl:
      "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?q=80&w=600&auto=format&fit=crop",
    mode: "selling",
    timeline: [
      { label: "Offer", done: true },
      { label: "Payment", done: false },
      { label: "Closed", done: true },
    ],
  },
];

const formatPrice = (value: number) => `₦${value.toLocaleString()}`;

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

      return () => {
        isMounted = false;
      };
    }, []),
  );

  const filteredOrders = useMemo(
    () =>
      orders.filter(
        (order) => order.mode === activeMode && order.status === activeStatus,
      ),
    [activeMode, activeStatus],
  );

  const activeOrdersCount = orders.filter(
    (order) => order.status === "active",
  ).length;

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
          <View className="rounded-3xl bg-gray-50 p-4 dark:bg-white/5">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-xs font-bold uppercase tracking-widest text-gray-400">
                  Active Escrow
                </Text>
                <Text className="mt-2 text-3xl font-black text-gray-950 dark:text-white">
                  {activeOrdersCount}
                </Text>
              </View>
              <View className="h-12 w-12 items-center justify-center rounded-2xl bg-brand/10">
                <Ionicons name="shield-checkmark" size={24} color="#2563EB" />
              </View>
            </View>
            <View className="mt-4 flex-row border-t border-gray-200 pt-4 dark:border-white/10">
              <View className="flex-1">
                <Text className="text-xs text-gray-500 dark:text-gray-400">
                  Buying
                </Text>
                <Text className="mt-1 text-lg font-black text-gray-950 dark:text-white">
                  {orders.filter((order) => order.mode === "buying").length}
                </Text>
              </View>
              <View className="mx-4 w-px bg-gray-200 dark:bg-white/10" />
              <View className="flex-1">
                <Text className="text-xs text-gray-500 dark:text-gray-400">
                  Selling
                </Text>
                <Text className="mt-1 text-lg font-black text-gray-950 dark:text-white">
                  {orders.filter((order) => order.mode === "selling").length}
                </Text>
              </View>
            </View>
          </View>

          <View className="mt-5 flex-row rounded-full bg-gray-100 p-1 dark:bg-white/5">
            {[
              { label: "Buying", value: "buying" as const },
              { label: "Selling", value: "selling" as const },
            ].map((mode) => (
              <Pressable
                key={mode.value}
                onPress={() => setActiveMode(mode.value)}
                className={`h-11 flex-1 items-center justify-center rounded-full ${
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

          {filteredOrders.length ? (
            <View className="mt-5">
              {filteredOrders.map((order) => {
                const tone = getStatusTone(order.status);

                return (
                  <Pressable
                    key={order.id}
                    className="mb-4 rounded-3xl border border-gray-100 bg-white p-4 dark:border-white/5 dark:bg-[#1A1A1A]"
                  >
                    <View className="flex-row">
                      <Image
                        source={
                          order.imageUrl
                            ? { uri: order.imageUrl }
                            : require("@/assets/images/shoe.jpg")
                        }
                        className="h-20 w-20 rounded-2xl bg-gray-100 dark:bg-white/5"
                      />
                      <View className="ml-3 flex-1">
                        <View className="flex-row items-center justify-between">
                          <Text className="text-xs font-bold uppercase tracking-widest text-gray-400">
                            {order.id}
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
                              {order.status}
                            </Text>
                          </View>
                        </View>
                        <Text
                          className="mt-1 text-base font-bold text-gray-950 dark:text-white"
                          numberOfLines={2}
                        >
                          {order.productName}
                        </Text>
                        <Text className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {order.counterpartyRole}: {order.counterparty}
                        </Text>
                      </View>
                    </View>

                    <View className="mt-4 flex-row items-center justify-between border-t border-gray-100 pt-4 dark:border-white/5">
                      <View>
                        <Text className="text-xs text-gray-500 dark:text-gray-400">
                          Total
                        </Text>
                        <Text className="mt-1 text-lg font-black text-gray-950 dark:text-white">
                          {formatPrice(order.price * order.quantity)}
                        </Text>
                      </View>
                      <View className="items-end">
                        <Text className="text-xs text-gray-500 dark:text-gray-400">
                          Updated
                        </Text>
                        <Text className="mt-1 text-sm font-bold text-gray-950 dark:text-white">
                          {order.updatedAt}
                        </Text>
                      </View>
                    </View>

                    <View className="mt-4 border-t border-gray-100 pt-4 dark:border-white/5">
                      <View className="flex-row items-center">
                        <Ionicons
                          name={tone.icon}
                          size={17}
                          color={
                            order.status === "active"
                              ? "#2563EB"
                              : order.status === "completed"
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
                      {order.timeline.map((item, index) => (
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
                          {index < order.timeline.length - 1 && (
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
                      {order.timeline.map((item) => (
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
                            params: { id: String(order.productId) },
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
                          router.push({
                            pathname: "/messages/[id]",
                            params: {
                              id: order.id,
                              sellerName: order.counterparty,
                              productName: order.productName,
                              productPrice: formatPrice(order.price),
                              productId: String(order.productId),
                            },
                          })
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
