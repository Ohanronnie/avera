import { ReactNode, useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  View,
  PanResponder,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/themed/theme";
import { useColorScheme } from "nativewind";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

type BottomSheetProps = {
  visible: boolean;
  onClose?: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  alwaysVisible?: boolean;
  showCloseButton?: boolean;
  coverTabs?: boolean;
};

export function BottomSheet({
  visible,
  onClose,
  title,
  subtitle,
  children,
  alwaysVisible = false,
  showCloseButton = true,
  coverTabs = false,
}: BottomSheetProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  const closeSheet = () => {
    if (alwaysVisible) return;

    Animated.timing(translateY, {
      toValue: SCREEN_HEIGHT,
      duration: 220,
      useNativeDriver: true,
    }).start(() => onClose?.());
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 8,
      onPanResponderMove: (_, gesture) => {
        if (gesture.dy > 0) {
          translateY.setValue(gesture.dy);
        }
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy > 80 && !alwaysVisible) {
          closeSheet();
          return;
        }

        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 4,
        }).start();
      },
    }),
  ).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 4,
      }).start();
    } else if (!alwaysVisible) {
      translateY.setValue(SCREEN_HEIGHT);
    }
  }, [alwaysVisible, translateY, visible]);

  const sheet = (
    <View className="absolute left-0 right-0" style={{ bottom: -5 }}>
      {!alwaysVisible && (
        <Pressable
          onPress={closeSheet}
          className="absolute bottom-0 left-0 right-0 h-screen bg-black/45"
        />
      )}

      <Animated.View
        className="rounded-t-[32px] border border-gray-100 bg-white px-5 pt-3 shadow-2xl dark:border-white/10 dark:bg-[#101010]"
        style={{ transform: [{ translateY }] }}
      >
        <View {...panResponder.panHandlers} className="items-center pb-4 pt-1">
          <View className="h-1.5 w-12 rounded-full bg-gray-300 dark:bg-white/20" />
        </View>

        {(title || subtitle || showCloseButton) && (
          <View className="mb-5 flex-row items-start justify-between">
            <View className="flex-1 pr-4">
              {title && (
                <Text className="text-2xl font-bold text-gray-950 dark:text-white">
                  {title}
                </Text>
              )}
              {subtitle && (
                <Text className="mt-1 text-sm leading-5 text-gray-500 dark:text-gray-400">
                  {subtitle}
                </Text>
              )}
            </View>

            {showCloseButton && !alwaysVisible && (
              <Pressable
                onPress={closeSheet}
                className="h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-white/10"
              >
                <Ionicons
                  name="close"
                  size={20}
                  color={isDark ? "white" : "#111827"}
                />
              </Pressable>
            )}
          </View>
        )}

        {children}
        <View style={{ height: Math.max(insets.bottom, 20) + 16 }} />
      </Animated.View>
    </View>
  );

  if (alwaysVisible && !coverTabs) {
    return visible ? sheet : null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={closeSheet}
    >
      {sheet}
    </Modal>
  );
}
