import { AveraLoader } from "@/components/brand/AveraLoader";
import { Text } from "@/components/themed/theme";
import { axiosInstance } from "@/utils/axios";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useMemo, useState } from "react";
import {
  ScrollView,
  View,
  TouchableOpacity,
  Image,
  ImageBackground,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useUnreadConversationCount } from "@/hooks/use-unread-conversation-count";

type ProfileUser = {
  id?: number;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  email?: string;
  bio?: string;
  avatarUrl?: string | null;
  coverPhotoUrl?: string | null;
  phoneNumber?: string;
  location?: {
    address?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
    zipCode?: string | null;
  };
};

export default function AccountScreen() {
  const insets = useSafeAreaInsets();
  const { isDark, themeMode, setTheme } = useTheme();
  const { logout, login } = useAuth();
  const [profile, setProfile] = useState<ProfileUser | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [profileLoadFailed, setProfileLoadFailed] = useState(false);
  const { unreadConversationCount } = useUnreadConversationCount();

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      setIsProfileLoading(true);
      setProfileLoadFailed(false);

      axiosInstance
        .get("/users/me")
        .then(({ data }) => {
          if (!isMounted) return;
          setProfile(data);
          login(data);
          setIsProfileLoading(false);
        })
        .catch(() => {
          if (!isMounted) return;
          setProfile(null);
          setProfileLoadFailed(true);
          setIsProfileLoading(false);
        });

      return () => {
        isMounted = false;
      };
    }, [login]),
  );

  const handleLogout = async () => {
    await logout();
    router.replace("/(auth)/login");
  };

  const displayName =
    profile?.fullName ||
    [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") ||
    "Avera User";
  const email = profile?.email || "Add your email";
  const avatarUrl = profile?.avatarUrl || null;
  const initials = (
    [profile?.firstName, profile?.lastName]
      .filter(Boolean)
      .map((name) => name?.trim().slice(0, 1))
      .join("") ||
    profile?.username?.trim().slice(0, 2) ||
    profile?.email?.trim().slice(0, 2) ||
    "AU"
  ).toUpperCase();
  const coverPhotoUrl = profile?.coverPhotoUrl || null;
  const locationSummary = [
    profile?.location?.city,
    profile?.location?.state,
    profile?.location?.country,
  ]
    .filter(Boolean)
    .join(", ");

  const sections = useMemo(
    () => [
      {
        title: "Selling",
        items: [
          {
            icon: "shirt-outline",
            label: "My Inventory",
            route: {
              pathname: "/profile/inventory",
              params: {
                userId: profile?.id ? String(profile.id) : undefined,
                sellerName: displayName,
              },
            },
          },
          {
            icon: "wallet-outline",
            label: "Payments & Payouts",
            route: "/wallet",
          },
        ],
      },
      {
        title: "Account",
        items: [
          {
            icon: "chatbubbles-outline",
            label: "Messages",
            count: unreadConversationCount,
            route: "/messages",
          },
          {
            icon: "heart-outline",
            label: "Saved Items",
            route: "/(tabs)/wishlist",
          },
          {
            icon: "settings-outline",
            label: "Edit Profile",
            route: "/profile/edit",
          },
        ],
      },
      {
        title: "Support",
        items: [{ icon: "help-circle-outline", label: "Help & Support" }],
      },
    ],
    [displayName, profile?.id, unreadConversationCount],
  );
  const themeOptions = [
    { label: "Auto", value: "system", icon: "phone-portrait-outline" },
    { label: "Light", value: "light", icon: "sunny-outline" },
    { label: "Dark", value: "dark", icon: "moon-outline" },
  ] as const;
  const showLoadingOverlay = isProfileLoading;

  return (
    <View className="flex-1 bg-white dark:bg-[#0A0A0A]">
      {profile ? (
        <>
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}
            showsVerticalScrollIndicator={false}
          >
            <ImageBackground
              source={coverPhotoUrl ? { uri: coverPhotoUrl } : undefined}
              className="bg-brand pb-12 rounded-b-[32px] items-center relative overflow-hidden"
              imageStyle={{ opacity: coverPhotoUrl ? 0.38 : 0 }}
              style={{ paddingTop: insets.top + 12 }}
            >
              <View className="absolute inset-0 bg-brand/80" />
              <View className="w-full px-5 flex-row justify-between items-center">
                <TouchableOpacity
                  onPress={() => router.back()}
                  className="w-10 h-10 bg-white/20 rounded-full items-center justify-center"
                >
                  <Ionicons name="chevron-back" size={20} color="white" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => router.push("/profile/edit")}
                  className="w-10 h-10 bg-white/20 rounded-full items-center justify-center"
                >
                  <Ionicons name="create-outline" size={20} color="white" />
                </TouchableOpacity>
              </View>

              <View className="mt-4">
                <View className="w-28 h-28 rounded-full border border-white p-1">
                  {avatarUrl ? (
                    <Image
                      source={{ uri: avatarUrl }}
                      className="w-full h-full rounded-full"
                    />
                  ) : (
                    <View className="h-full w-full items-center justify-center rounded-full bg-white/20">
                      <Text
                        variant="none"
                        className="text-4xl font-semibold text-white"
                      >
                        {initials}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              <View className="items-center mt-6 px-6">
                <Text className="text-2xl font-bold text-white tracking-tight">
                  {displayName}
                </Text>
                <Text className="text-xs text-center font-medium mt-1 tracking-widest text-gray-100">
                  {email}
                </Text>
                {locationSummary ? (
                  <View className="mt-3 flex-row items-center rounded-full bg-white/15 px-3 py-1.5">
                    <Ionicons name="location-outline" size={14} color="white" />
                    <Text className="ml-1.5 text-xs font-semibold text-white">
                      {locationSummary}
                    </Text>
                  </View>
                ) : null}
              </View>
            </ImageBackground>

            <View className="mx-4 mt-6 rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-white/5 dark:bg-white/5">
              <Text className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                Profile
              </Text>
              <Text className="mt-2 text-sm leading-5 text-gray-600 dark:text-gray-300">
                {profile.bio ||
                  "Add a short bio so buyers and sellers know you."}
              </Text>
              {profile.location?.address ? (
                <View className="mt-4 flex-row items-start">
                  <Ionicons
                    name="home-outline"
                    size={18}
                    color={isDark ? "#9CA3AF" : "#6B7280"}
                  />
                  <Text className="ml-2 flex-1 text-sm text-gray-600 dark:text-gray-300">
                    {profile.location.address}
                  </Text>
                </View>
              ) : null}
            </View>

            <View className="px-4 pt-8 pb-6">
              {sections.map((section) => (
                <View key={section.title} className="mb-10">
                  <Text className="ml-4 mb-3 text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                    {section.title}
                  </Text>
                  <View className="bg-gray-50/50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5 overflow-hidden">
                    {section.items.map((item, index) => (
                      <TouchableOpacity
                        key={index}
                        activeOpacity={0.7}
                        onPress={() => {
                          if (item.route) router.push(item.route as any);
                        }}
                        className={`flex-row items-center py-3 px-4 ${
                          index !== section.items.length - 1
                            ? "border-b border-gray-100/50 dark:border-white/5"
                            : ""
                        }`}
                      >
                        <View className="w-11 h-11 bg-white dark:bg-white/10 rounded-2xl items-center justify-center border border-gray-100 dark:border-white/10">
                          <Ionicons
                            name={item.icon as any}
                            size={20}
                            color={isDark ? "#FFF" : "#111"}
                          />
                        </View>
                        <Text className="ml-4 flex-1 text-base font-semibold text-gray-800 dark:text-gray-200 tracking-tight">
                          {item.label}
                        </Text>
                        {Boolean(item.count) && (
                          <View className="bg-brand/10 px-2.5 py-1 rounded-2xl mr-2">
                            <Text className="text-brand text-xs font-semibold">
                              {item.count}
                            </Text>
                          </View>
                        )}
                        <Ionicons
                          name="chevron-forward"
                          size={16}
                          color={isDark ? "#444" : "#D1D5DB"}
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))}

              <View className="mb-10">
                <Text className="ml-4 mb-3 text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                  Preferences
                </Text>
                <View className="bg-gray-50/50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5 overflow-hidden">
                  <View className="py-4 px-4">
                    <View className="flex-row items-center">
                      <View className="w-11 h-11 bg-white dark:bg-white/5 rounded-2xl items-center justify-center border border-gray-100 dark:border-white/10">
                        <Ionicons
                          name={
                            themeMode === "system"
                              ? "phone-portrait-outline"
                              : isDark
                                ? "moon"
                                : "sunny-outline"
                          }
                          size={20}
                          color={isDark ? "#A78BFA" : "#111"}
                        />
                      </View>
                      <View className="ml-4 flex-1">
                        <Text className="text-base font-semibold text-gray-800 dark:text-gray-200 tracking-tight">
                          Appearance
                        </Text>
                        <Text className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                          {themeMode === "system"
                            ? "Using your phone theme"
                            : `${themeMode === "dark" ? "Dark" : "Light"} mode`}
                        </Text>
                      </View>
                    </View>

                    <View className="mt-4 flex-row rounded-2xl bg-white p-1 dark:bg-[#0A0A0A]">
                      {themeOptions.map((option) => {
                        const active = themeMode === option.value;
                        return (
                          <TouchableOpacity
                            key={option.value}
                            activeOpacity={0.75}
                            onPress={() => setTheme(option.value)}
                            className={`h-11 flex-1 flex-row items-center justify-center rounded-2xl ${
                              active ? "bg-brand" : ""
                            }`}
                          >
                            <Ionicons
                              name={option.icon as any}
                              size={16}
                              color={
                                active
                                  ? "#FFFFFF"
                                  : isDark
                                    ? "#9CA3AF"
                                    : "#6B7280"
                              }
                            />
                            <Text
                              variant="none"
                              className={`ml-1.5 text-xs font-bold ${
                                active
                                  ? "text-white"
                                  : "text-gray-600 dark:text-gray-400"
                              }`}
                            >
                              {option.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                </View>
              </View>
            </View>

            <View className="px-4">
              <TouchableOpacity
                onPress={handleLogout}
                activeOpacity={0.8}
                className="flex-row items-center justify-center bg-gray-50 dark:bg-red-500/5 py-5 rounded-2xl border border-gray-100 dark:border-red-500/10"
              >
                <Ionicons name="log-out-outline" size={20} color="#EF4444" />
                <Text className="ml-3 font-bold text-red-500">Sign Out</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          <TouchableOpacity
            onPress={() => router.push("/product/create")}
            className="absolute bottom-32 right-8 w-16 h-16 bg-brand rounded-full items-center justify-center border-2 border-white dark:border-[#0A0A0A]"
            style={{ elevation: 0 }}
          >
            <Ionicons name="add" size={32} color="white" />
          </TouchableOpacity>
        </>
      ) : !showLoadingOverlay && profileLoadFailed ? (
        <View className="flex-1 items-center justify-center px-8">
          <View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-gray-50 dark:bg-white/5">
            <Ionicons
              name="alert-circle-outline"
              size={32}
              color={isDark ? "#9CA3AF" : "#6B7280"}
            />
          </View>
          <Text className="text-center text-lg font-bold text-gray-900 dark:text-white">
            Profile unavailable
          </Text>
          <Text className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">
            We couldn't load your profile right now.
          </Text>
        </View>
      ) : null}

      {showLoadingOverlay ? (
        <View className="absolute inset-0 items-center justify-center bg-white/95 dark:bg-[#0A0A0A]/95">
          <AveraLoader label="Loading profile" />
        </View>
      ) : null}
    </View>
  );
}
