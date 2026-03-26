import { PropsWithChildren, createContext, useContext, useMemo, useState } from "react";
import { useColorScheme } from "react-native";

import { Theme, ThemeName, appThemes } from "./tokens";

type ThemeContextValue = {
  theme: Theme;
  themeName: ThemeName;
  setThemeName: (name: ThemeName) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getInitialThemeName(colorScheme: ReturnType<typeof useColorScheme>): ThemeName {
  return colorScheme === "dark" ? "splittripDark" : "splittripLight";
}

export function ThemeProvider({ children }: PropsWithChildren) {
  const colorScheme = useColorScheme();
  const [themeName, setThemeName] = useState<ThemeName>(() => getInitialThemeName(colorScheme));
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
