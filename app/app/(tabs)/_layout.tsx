import { Tabs } from "expo-router/tabs";
import { useEffect } from "react";
import { axiosInstance } from "@/utils/axios";
import { useAuth } from "@/contexts/AuthContext";
import { router } from "expo-router";
import {
  Ionicons,
  Feather,
  MaterialCommunityIcons,
  AntDesign,
  MaterialIcons,
} from "@expo/vector-icons";
import { View, Platform } from "react-native";
import { useColorScheme } from "nativewind";

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

export default function TabsLayout() {
  const { login } = useAuth();

  useEffect(() => {
    const getUser = async () => {
      try {
        const response = await axiosInstance.get("/users/me");
        const data = response.data;
        if (!data.infoUpdated) {
          router.replace("/(auth)/user-info");
        } else {
          return login(data);
        }
      } catch (error: any) {
        const error_response = error?.response?.data;
        if (
          error_response?.message &&
          (error_response.code as string) === "ACCOUNT_NOT_VERIFIED"
        ) {
          return router.replace(
            "/(auth)/otp-verification?email=" +
              error_response.email +
              "&id=" +
              error_response.userId,
          );
        }
        return router.replace("/(auth)/login");
      }
    };
    getUser();
  }, []);

  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: isDark ? "#0A0A0A" : "#FFFFFF",
          borderTopWidth: 1,
          borderTopColor: isDark ? "#111" : "#F3F4FB",
          height: Platform.OS === "ios" ? 88 : 68,
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
          marginBottom: Platform.OS === "ios" ? 0 : 10,
        },
        tabBarIconStyle: {
          marginTop: Platform.OS === "ios" ? 6 : 0,
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
