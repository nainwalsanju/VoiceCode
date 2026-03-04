import { useState, useEffect } from "react";

type Theme = "light" | "dark" | "system";

export function useTheme() {
    const [theme, setTheme] = useState<Theme>(() => {
        const saved = localStorage.getItem("theme") as Theme;
        return saved || "dark"; // Default to dark as requested
    });

    useEffect(() => {
        const root = window.document.documentElement;
        const isDark =
            theme === "dark" ||
            (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

        if (isDark) {
            root.classList.remove("light");
            root.classList.add("dark");
        } else {
            root.classList.remove("dark");
            root.classList.add("light");
        }

        localStorage.setItem("theme", theme);
    }, [theme]);

    // Handle system theme changes
    useEffect(() => {
        if (theme === "system") {
            const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
            const handleChange = () => {
                const root = window.document.documentElement;
                if (mediaQuery.matches) {
                    root.classList.remove("light");
                    root.classList.add("dark");
                } else {
                    root.classList.remove("dark");
                    root.classList.add("light");
                }
            };

            mediaQuery.addEventListener("change", handleChange);
            return () => mediaQuery.removeEventListener("change", handleChange);
        }
    }, [theme]);

    return { theme, setTheme };
}
