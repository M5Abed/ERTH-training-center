import { createContext, useContext, useState, useCallback, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
    const setTheme = useCallback(() => {}, []);
    const toggleTheme = useCallback(() => {}, []);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('thinktank_theme', 'dark');
    }, []);

    return (
        <ThemeContext.Provider value={{ theme: 'dark', setTheme, toggleTheme, isDark: true }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
    return ctx;
}
