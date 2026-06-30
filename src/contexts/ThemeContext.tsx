import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme, LayoutAnimation, Platform, UIManager } from 'react-native';
import { getTheme, storeTheme } from '../utils/storage';

// Define theme types
export type ThemeType = 'light' | 'dark';

export const lightTheme = {
  background: '#FAFCFB',
  surface: '#FFFFFF',
  primary: '#0A6B4B',
  secondary: '#9DB8B0',
  accent: '#C9A84C',
  border: '#E0EDE8',
  text: '#0D1F1A',
  textSecondary: '#4B6B61',
  tabBar: '#FAFCFB',
  tabBarBorder: '#E0EDE8',
  card: '#FFFFFF',
  cardBorder: '#E0EDE8',
  icon: '#0A6B4B',
  iconInactive: '#9DB8B0',
};

export const darkTheme = {
  background: '#121212',
  surface: '#1E1E1E',
  primary: '#249C76', // Lighter green for dark mode contrast
  secondary: '#5C7A70',
  accent: '#D4B86A',
  border: '#2C3632',
  text: '#F5F5F5',
  textSecondary: '#A0AAB2',
  tabBar: '#1A1A1A',
  tabBarBorder: '#2C3632',
  card: '#1E1E1E',
  cardBorder: '#2C3632',
  icon: '#249C76',
  iconInactive: '#5C7A70',
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
