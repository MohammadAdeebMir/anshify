import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeMode = 'default' | 'amoled' | 'midnight';

interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (t: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({ theme: 'default', setTheme: () => {} });

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(
    () => (localStorage.getItem('ph-theme') as ThemeMode) || 'default'
  );

  useEffect(() => {
    localStorage.setItem('ph-theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const setTheme = (t: ThemeMode) => setThemeState(t);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
