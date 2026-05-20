import { Tabs } from "expo-router/tabs";
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
import {
  Home,
  CreditCard,
  Heart,
  ShoppingBag,
  User,
} from "lucide-react-native";
import { Platform } from "react-native";
import { useColorScheme } from "nativewind";
import { useUnreadConversationCount } from "@/hooks/use-unread-conversation-count";
import { useFonts, Geist_100Thin, Geist_200ExtraLight, Geist_300Light, Geist_400Regular, Geist_500Medium, Geist_600SemiBold, Geist_700Bold, Geist_800ExtraBold, Geist_900Black } from "@expo-google-fonts/geist"
import { Text, TextInput } from "react-native";
import { G } from "react-native-svg";

/**
 * ICON EXPLORER SETTINGS
 * Change the index below:
 * 0 = Ionicons
 * 1 = Feather
 * 2 = Material Community
 * 3 = AntDesign
 * 4 = Material Icons
 * 5 = Lucide
 */
const ICON_SET_INDEX = 1;

const LUCIDE_ICONS = {
  home: Home,
  wallet: CreditCard,
  wishlist: Heart,
  orders: ShoppingBag,
  profile: User,
};

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
    activeModifier: (name: string) => name,
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
  {
    name: "Set 6: Lucide (Adjustable Stroke)",
    Library: null,
    icons: {
      home: "home",
      wallet: "credit-card",
      wishlist: "heart",
      orders: "shopping-bag",
      profile: "user",
    },
    activeModifier: (name: string) => name,
  },
] as const;

type TabType = keyof typeof LUCIDE_ICONS;

const TabIcon = ({
  type,
  color,
  focused,
}: {
  type: TabType;
  color: string;
  focused: boolean;
}) => {
  const currentSet = ICON_SETS[ICON_SET_INDEX];

  if (currentSet.name.includes("Lucide")) {
    const IconComponent = LUCIDE_ICONS[type];

    return (
      <IconComponent
        size={24}
        color={color}
        strokeWidth={focused ? 2.9 : 2.2}
      />
    );
  }

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
  const { unreadConversationCount } = useUnreadConversationCount();

  const badgeCount = unreadConversationCount;
  const unreadBadge = badgeCount > 9 ? "9+" : String(badgeCount);
 const [loaded] = useFonts({
   Geist_100Thin,
   Geist_200ExtraLight,
   Geist_300Light,
   Geist_400Regular,
   Geist_500Medium,
   Geist_600SemiBold,
   Geist_700Bold,
   Geist_800ExtraBold,
   Geist_900Black,
   
 });
 if (!loaded) return null;
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
          height: 88,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarActiveTintColor: "#2563EB",
        tabBarInactiveTintColor: isDark ? "#555" : "#9CA3AF",
        headerShown: false,
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 13,
          fontWeight: "900",
          letterSpacing: 0.5,
          marginTop: 2,
          marginBottom: 2,
          fontFamily: "Geist_500Medium",
        },
        tabBarIconStyle: {
          marginTop: 8,
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
