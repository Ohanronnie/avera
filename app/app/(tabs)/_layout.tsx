import { Tabs } from "expo-router/tabs";
import { useFocusEffect, useSegments } from "expo-router";
import {
  Badge,
  Icon,
  Label,
  NativeTabs,
} from "expo-router/unstable-native-tabs";
import {
  Ionicons,
  Feather,
  MaterialCommunityIcons,
  AntDesign,
  MaterialIcons,
} from "@expo/vector-icons";
import { Platform } from "react-native";
import { useColorScheme } from "nativewind";
import { useCallback, useEffect, useState } from "react";

import { axiosInstance } from "@/utils/axios";
import { connectSocket } from "@/utils/socket";

/**
 * ICON EXPLORER SETTINGS
 * Change the index below (0 to 4) to switch between different icon families
 */
const ICON_SET_INDEX = 1;

const ICON_SETS = [
  {
    name: "Set 1: Ionicons (Outline/Solid)",
    Library: Ionicons,
    icons: {
      home: "home-outline",
      wallet: "wallet-outline",
      wishlist: "heart-outline",
      orders: "receipt-outline",
      profile: "person-outline",
    },
    activeModifier: (name: string) => name.replace("-outline", ""),
  },
  {
    name: "Set 2: Feather (Minimalist)",
    Library: Feather,
    icons: {
      home: "home",
      wallet: "credit-card",
      wishlist: "heart",
      orders: "shopping-bag",
      profile: "user",
    },
    activeModifier: (name: string) => name, // Feather doesn't have solid/outline variants usually
  },
  {
    name: "Set 3: Material Community (Modern)",
    Library: MaterialCommunityIcons,
    icons: {
      home: "home-variant-outline",
      wallet: "wallet-outline",
      wishlist: "heart-outline",
      orders: "text-box-check-outline",
      profile: "account-outline",
    },
    activeModifier: (name: string) => name.replace("-outline", ""),
  },
  {
    name: "Set 4: AntDesign (Simple)",
    Library: AntDesign,
    icons: {
      home: "home",
      wallet: "wallet",
      wishlist: "hearto",
      orders: "profile",
      profile: "user",
    },
    activeModifier: (name: string) => name.replace("-o", ""),
  },
  {
    name: "Set 5: Material Icons (Classic)",
    Library: MaterialIcons,
    icons: {
      home: "home",
      wallet: "account-balance-wallet",
      wishlist: "favorite-border",
      orders: "receipt-long",
      profile: "person",
    },
    activeModifier: (name: string) => name,
  },
];

const TabIcon = ({
  type,
  color,
  focused,
}: {
  type: keyof (typeof ICON_SETS)[0]["icons"];
  color: string;
  focused: boolean;
}) => {
  const currentSet = ICON_SETS[ICON_SET_INDEX];
  const { Library, icons, activeModifier } = currentSet;
  const baseName = icons[type];
  const iconName = focused ? activeModifier(baseName) : baseName;

  return <Library name={iconName as any} size={24} color={color} />;
};

const IOS_TABS = [
  {
    name: "home",
    label: "Home",
    sf: { default: "house", selected: "house.fill" },
  },
  {
    name: "wallet",
    label: "Wallet",
    sf: { default: "creditcard", selected: "creditcard.fill" },
  },
  {
    name: "wishlist",
    label: "Wishlist",
    sf: { default: "heart", selected: "heart.fill" },
  },
  {
    name: "orders",
    label: "Orders",
    sf: { default: "bag", selected: "bag.fill" },
  },
  {
    name: "profile",
    label: "Profile",
    sf: { default: "person", selected: "person.fill" },
  },
] as const;

export default function TabsLayout() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const segments = useSegments();
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [orderUpdates, setOrderUpdates] = useState(0);
  const badgeCount = unreadMessages + orderUpdates;
  const unreadBadge = badgeCount > 9 ? "9+" : String(badgeCount);

  const refreshUnreadMessages = useCallback(async () => {
    try {
      const { data } = await axiosInstance.get(
        "/chat/conversations/unread-count",
      );
      setUnreadMessages(Number(data.count || 0));
    } catch {
      setUnreadMessages(0);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshUnreadMessages();
    }, [refreshUnreadMessages]),
  );

  useEffect(() => {
    refreshUnreadMessages();

    const socket = connectSocket();
    const handleUnreadCount = (payload: { count?: number }) => {
      setUnreadMessages(Number(payload?.count || 0));
    };
    const handleOrderUpdated = () => {
      setOrderUpdates((current) => Math.min(current + 1, 99));
    };

    socket.on("message:new", refreshUnreadMessages);
    socket.on("conversation:read", refreshUnreadMessages);
    socket.on("conversation:unread-count", handleUnreadCount);
    socket.on("order:updated", handleOrderUpdated);

    return () => {
      socket.off("message:new", refreshUnreadMessages);
      socket.off("conversation:read", refreshUnreadMessages);
      socket.off("conversation:unread-count", handleUnreadCount);
      socket.off("order:updated", handleOrderUpdated);
    };
  }, [refreshUnreadMessages]);

  useEffect(() => {
    if (segments.at(-1) === "orders") {
      setOrderUpdates(0);
    }
  }, [segments]);

  if (Platform.OS === "ios") {
    return (
      <NativeTabs
        backgroundColor={isDark ? "#0A0A0A" : "#FFFFFF"}
        blurEffect={
          isDark ? "systemChromeMaterialDark" : "systemChromeMaterialLight"
        }
        disableTransparentOnScrollEdge
        iconColor={{
          default: isDark ? "#555" : "#9CA3AF",
          selected: "#2563EB",
        }}
        labelStyle={{
          default: {
            color: isDark ? "#555" : "#9CA3AF",
            fontSize: 10,
            fontWeight: "700",
          },
          selected: {
            color: "#2563EB",
            fontSize: 10,
            fontWeight: "700",
          },
        }}
        shadowColor={isDark ? "#111" : "#F3F4FB"}
        tintColor="#2563EB"
      >
        {IOS_TABS.map((tab) => (
          <NativeTabs.Trigger key={tab.name} name={tab.name}>
            <Icon sf={tab.sf} />
            <Label>{tab.label}</Label>
            {tab.name === "orders" && badgeCount > 0 ? (
              <Badge>{unreadBadge}</Badge>
            ) : null}
          </NativeTabs.Trigger>
        ))}
      </NativeTabs>
    );
  }

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: isDark ? "#0A0A0A" : "#FFFFFF",
          borderTopWidth: 1,
          borderTopColor: isDark ? "#111" : "#F3F4FB",
          height: 68,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarActiveTintColor: "#2563EB",
        tabBarInactiveTintColor: isDark ? "#555" : "#9CA3AF",
        headerShown: false,
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "700",
          letterSpacing: 0.5,
          marginTop: 4,
          marginBottom: 10,
        },
        tabBarIconStyle: {
          marginTop: 0,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          tabBarLabel: "Home",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon type="home" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          tabBarLabel: "Wallet",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon type="wallet" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="wishlist"
        options={{
          tabBarLabel: "Wishlist",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon type="wishlist" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          tabBarLabel: "Orders",
          tabBarBadge: badgeCount > 0 ? unreadBadge : undefined,
          tabBarBadgeStyle: {
            backgroundColor: "#2563EB",
            color: "#FFFFFF",
            fontSize: 10,
            fontWeight: "800",
            minWidth: 18,
            height: 18,
          },
          tabBarIcon: ({ color, focused }) => (
            <TabIcon type="orders" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarLabel: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon type="profile" color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
