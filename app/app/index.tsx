import { useEffect, useRef } from "react";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { Animated, StyleSheet, Text, View } from "react-native";

import { AnimatedAveraLogo } from "@/components/brand/AnimatedAveraLogo";
import { useTheme } from "@/contexts/ThemeContext";

export default function Index() {
  const { isDark } = useTheme();
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const wordmarkAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let isMounted = true;
    let routeTimeout: ReturnType<typeof setTimeout> | undefined;

    const entranceAnimation = Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 650,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(360),
        Animated.timing(wordmarkAnim, {
          toValue: 1,
          duration: 650,
          useNativeDriver: true,
        }),
      ]),
    ]);

    const decideRoute = async () => {
      const token = await SecureStore.getItemAsync("accessToken");

      if (!isMounted) return;

      if (token) {
        router.replace("/(tabs)/home");
      } else {
        router.replace("/(auth)/onboarding");
      }
    };

    entranceAnimation.start(({ finished }) => {
      if (finished) {
        routeTimeout = setTimeout(decideRoute, 1500);
      }
    });

    return () => {
      isMounted = false;
      if (routeTimeout) clearTimeout(routeTimeout);
      entranceAnimation.stop();
      scaleAnim.stopAnimation();
      wordmarkAnim.stopAnimation();
    };
  }, [scaleAnim, wordmarkAnim]);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isDark ? "#0A0A0A" : "#ffffff" },
      ]}
    >
      <Animated.View
        style={[
          styles.logoWrap,
          {
            transform: [
              {
                scale: scaleAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.85, 1],
                }),
              },
            ],
          },
        ]}
      >
        <AnimatedAveraLogo size={240} />
      </Animated.View>
      <Animated.View
        style={[
          styles.wordmarkWrap,
          {
            transform: [
              {
                translateY: wordmarkAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [10, 0],
                }),
              },
            ],
          },
        ]}
      >
        <Text style={styles.wordmark}>Avera</Text>
        <Text
          style={[styles.tagline, { color: isDark ? "#9CA3AF" : "#6B7280" }]}
        >
          The marketplace you can trust
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  logoWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  wordmarkWrap: {
    position: "absolute",
    alignItems: "center",
    bottom: 72,
  },
  wordmark: {
    color: "#2563EB",
    fontSize: 36,
    fontWeight: "800",
    lineHeight: 44,
  },
  tagline: {
    marginTop: 6,
    color: "#6B7280",
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
  },
});
