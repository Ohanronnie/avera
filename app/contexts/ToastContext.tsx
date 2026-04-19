import { Ionicons } from "@expo/vector-icons";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "@/components/ui/text";

type ToastVariant = "info" | "success" | "error";

type ToastOptions = {
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
};

type ToastItem = ToastOptions & {
  id: string;
};

type ToastContextValue = {
  show: (options: ToastOptions) => string;
  hide: (id: string) => void;
  hideAll: () => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

function getToastTheme(variant: ToastVariant) {
  if (variant === "success") {
    return {
      icon: "checkmark-circle",
      iconColor: "#4ADE80",
      iconBg: "bg-emerald-500/15",
      border: "border-emerald-500/30",
    } as const;
  }

  if (variant === "error") {
    return {
      icon: "alert-circle",
      iconColor: "#F87171",
      iconBg: "bg-red-500/15",
      border: "border-red-500/30",
    } as const;
  }

  return {
    icon: "information-circle",
    iconColor: "#60A5FA",
    iconBg: "bg-brand/15",
    border: "border-brand/40",
  } as const;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const hide = useCallback((id: string) => {
    if (timeoutsRef.current[id]) {
      clearTimeout(timeoutsRef.current[id]);
      delete timeoutsRef.current[id];
    }

    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const hideAll = useCallback(() => {
    Object.values(timeoutsRef.current).forEach((timeout) => clearTimeout(timeout));
    timeoutsRef.current = {};
    setToasts([]);
  }, []);

  const show = useCallback(
    ({ duration = 4000, variant = "info", ...options }: ToastOptions) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      setToasts((current) => [...current, { id, variant, duration, ...options }]);

      if (duration > 0) {
        timeoutsRef.current[id] = setTimeout(() => {
          hide(id);
        }, duration);
      }

      return id;
    },
    [hide]
  );

  const value = useMemo(
    () => ({
      show,
      hide,
      hideAll,
    }),
    [show, hide, hideAll]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}

      <View
        pointerEvents="box-none"
        className="absolute left-0 right-0 z-[999] px-4"
        style={{ top: insets.top + 10 }}
      >
        {toasts.map((toast) => {
          const theme = getToastTheme(toast.variant ?? "info");

          return (
            <View
              key={toast.id}
              className={`mb-3 rounded-3xl border bg-[#111214] px-4 py-4 shadow-lg ${theme.border}`}
            >
              <View className="flex-row items-start">
                <View
                  className={`mr-3 h-10 w-10 items-center justify-center rounded-full ${theme.iconBg}`}
                >
                  <Ionicons
                    name={theme.icon as any}
                    size={20}
                    color={theme.iconColor}
                  />
                </View>

                <View className="flex-1">
                  <Text className="text-sm font-semibold text-white">
                    {toast.title}
                  </Text>
                  {toast.description ? (
                    <Text className="mt-1 text-sm text-gray-400">
                      {toast.description}
                    </Text>
                  ) : null}
                </View>

                <Pressable
                  onPress={() => hide(toast.id)}
                  className="ml-3 h-8 w-8 items-center justify-center rounded-full bg-black/5 dark:bg-white/5"
                >
                  <Ionicons
                    name="close"
                    size={16}
                    color="#9CA3AF"
                  />
                </Pressable>
              </View>
            </View>
          );
        })}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }

  return context;
}
