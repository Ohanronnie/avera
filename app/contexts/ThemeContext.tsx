import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Appearance } from "react-native";
import { useColorScheme } from "nativewind";
import { ThemeMode, usePreferencesStore } from "@/stores/preferences-store";

type ResolvedThemeMode = "light" | "dark";

type ThemeContextType = {
  colorScheme: ResolvedThemeMode;
  themeMode: ThemeMode;
  isDark: boolean;
  setTheme: (mode: ThemeMode) => Promise<void>;
  toggleTheme: () => Promise<void>;
  hydrated: boolean;
};

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { colorScheme, setColorScheme } = useColorScheme();
  const [hydrated, setHydrated] = useState(false);
  const themeMode = usePreferencesStore((state) => state.themeMode);
  const setStoredThemeMode = usePreferencesStore((state) => state.setThemeMode);
  const systemScheme = Appearance.getColorScheme();
  const resolvedScheme: ResolvedThemeMode =
    colorScheme === "light" || colorScheme === "dark"
      ? colorScheme
      : systemScheme === "dark"
        ? "dark"
        : "light";

  useEffect(() => {
    let mounted = true;

    const syncTheme = async () => {
      try {
        setColorScheme(themeMode);
      } catch (error) {
        setColorScheme("system");
      } finally {
        if (mounted) {
          setHydrated(true);
        }
      }
    };

    syncTheme();

    return () => {
      mounted = false;
    };
  }, [setColorScheme, themeMode]);

  const setTheme = async (mode: ThemeMode) => {
    setStoredThemeMode(mode);
    setColorScheme(mode);
  };

  const toggleTheme = async () => {
    const nextTheme: ThemeMode = resolvedScheme === "dark" ? "light" : "dark";
    await setTheme(nextTheme);
  };

  const value = useMemo(
    () => ({
      colorScheme: resolvedScheme,
      themeMode,
      isDark: resolvedScheme === "dark",
      setTheme,
      toggleTheme,
      hydrated,
    }),
    [resolvedScheme, themeMode, hydrated],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used inside ThemeProvider");
  }

  return context;
}
