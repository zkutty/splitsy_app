import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from "react";
import { Platform, useColorScheme } from "react-native";

import { Theme, ThemeName, appThemes } from "./tokens";

type ThemeContextValue = {
  theme: Theme;
  themeName: ThemeName;
  setThemeName: (name: ThemeName) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);
const THEME_STORAGE_KEY = "__splittrip_theme_name__";

function getInitialThemeName(colorScheme: ReturnType<typeof useColorScheme>): ThemeName {
  return colorScheme === "dark" ? "splittripDark" : "splittripLight";
}

function isThemeName(value: string | null): value is ThemeName {
  return Boolean(value && value in appThemes);
}

function readStoredThemeName() {
  if (Platform.OS !== "web" || typeof window === "undefined") {
    return null;
  }

  const storedThemeName = window.localStorage.getItem(THEME_STORAGE_KEY);
  return isThemeName(storedThemeName) ? storedThemeName : null;
}

export function ThemeProvider({ children }: PropsWithChildren) {
  const colorScheme = useColorScheme();
  const [themeName, setThemeName] = useState<ThemeName>(() => readStoredThemeName() ?? getInitialThemeName(colorScheme));

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(THEME_STORAGE_KEY, themeName);
  }, [themeName]);

  const value = useMemo(
    () => ({
      theme: appThemes[themeName],
      themeName,
      setThemeName
    }),
    [themeName]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useAppTheme must be used within ThemeProvider.");
  }

  return context;
}
