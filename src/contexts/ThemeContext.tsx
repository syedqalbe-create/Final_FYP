import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme, LayoutAnimation, Platform, UIManager } from 'react-native';
import { getTheme, storeTheme } from '../utils/storage';

// Define theme types
export type ThemeType = 'light' | 'dark';

export const lightTheme = {
  background: '#F0FDFC', // Clean daylight teal-white
  surface: '#FFFFFF',
  primary: '#00897B', // Corporate teal
  secondary: '#00695C',
  accent: '#00BCD4',
  glow: '#1DE9B6', // Neon teal glow (light mode)
  border: '#B2DFDB',
  text: '#002020',
  textSecondary: '#00695C',
  tabBar: '#F0FDFC',
  tabBarBorder: '#B2DFDB',
  card: '#FFFFFF',
  cardBorder: '#B2DFDB',
  icon: '#00897B',
  iconInactive: '#80CBC4',
};

export const darkTheme = {
  background: '#050D0E', // Deep black-teal void
  surface: '#0A1A1C',   // HUD panel surface
  primary: '#00E5C8',   // Neon teal — main HUD color
  secondary: '#00A896', // Subdued teal secondary
  accent: '#1DE9B6',
  glow: '#39FF14',      // Neon green — active AR indicators
  border: '#0F2D2F',
  text: '#E0FFF8',      // Cold white-green text
  textSecondary: '#5E9E94',
  tabBar: '#050D0E',
  tabBarBorder: '#0F2D2F',
  card: '#0A1A1C',
  cardBorder: '#0F2D2F',
  icon: '#00E5C8',
  iconInactive: '#2E5F5A',
};

// Create theme context
type ThemeContextType = {
  theme: ThemeType;
  colors: typeof lightTheme;
  toggleTheme: () => void;
  isDark: boolean;
};

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  colors: lightTheme,
  toggleTheme: () => {},
  isDark: false,
});

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Theme provider component
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const deviceTheme = useColorScheme();
  const [theme, setTheme] = useState<ThemeType>(deviceTheme === 'dark' ? 'dark' : 'light');

  // Load saved theme preference on mount
  useEffect(() => {
    const loadTheme = async () => {
      const savedTheme = await getTheme();
      if (savedTheme !== null) {
        setTheme(savedTheme ? 'dark' : 'light');
      } else {
        setTheme(deviceTheme === 'dark' ? 'dark' : 'light');
      }
    };
    loadTheme();
  }, [deviceTheme]);

  const toggleTheme = async () => {
    // Configure layout animation for smooth transition
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    await storeTheme(newTheme === 'dark');
  };

  const colors = theme === 'light' ? lightTheme : darkTheme;

  return (
    <ThemeContext.Provider value={{ theme, colors, toggleTheme, isDark: theme === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook to use theme
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeContext;
