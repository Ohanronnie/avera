import { useEffect, useRef } from "react";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { Animated, StyleSheet, View, Dimensions } from "react-native";

export default function Index() {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let isMounted = true;

    const animation = Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    });

    const decideRoute = async () => {
      const token = await SecureStore.getItemAsync("accessToken");

      if (!isMounted) return;

      if (token) {
        router.replace("/(tabs)/home");
      } else {
        router.replace("/(auth)/onboarding");
      }
    };

    animation.start(({ finished }) => {
      if (finished) {
        decideRoute();
      }
    });

    return () => {
      isMounted = false;
      animation.stop();
      fadeAnim.stopAnimation();
    };
  }, [fadeAnim]);

  return (
    <View style={styles.container}>
      <Animated.Image
        source={require("../assets/images/splash.png")}
        style={[
          styles.logo,
          {
            opacity: fadeAnim,
            transform: [
              {
                scale: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.85, 1],
                }),
              },
            ],
          },
        ]}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: Dimensions.get("window").width * 0.7,
    height: Dimensions.get("window").width * 0.7,
  },
});
