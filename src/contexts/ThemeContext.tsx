import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColorScheme as useDeviceColorScheme } from "react-native";
import { useColorScheme as useNativewindColorScheme } from "nativewind";

// Define the type for our theme
type Theme = "light" | "dark";

// Define the shape of our context
interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  isDark: boolean;
}

// Create the context with an undefined default value
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Create the Provider component
export const ThemeProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const deviceTheme = useDeviceColorScheme();
  const { colorScheme, setColorScheme } = useNativewindColorScheme();
  const [theme, setTheme] = useState<Theme>(
    colorScheme === "dark" ? "dark" : "light"
  );

  // Initialize theme from AsyncStorage or device
  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem("app-theme");
      if (saved === "light" || saved === "dark") {
        setTheme(saved);
        setColorScheme(saved);
      } else {
        const initial = deviceTheme === "dark" ? "dark" : "light";
        setTheme(initial);
        setColorScheme(initial);
      }
    })();
    // Run once on mount; don't reapply when device theme changes to avoid overriding user choice
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleTheme = async () => {
    const newTheme: Theme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    setColorScheme(newTheme);
    await AsyncStorage.setItem("app-theme", newTheme);
  };

  return (
    <ThemeContext.Provider
      value={{ theme, toggleTheme, isDark: theme === "dark" }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
};
