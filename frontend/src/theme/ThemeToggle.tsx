
import { useTheme } from "./ThemeContext";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button type="button" className="theme-toggle" onClick={toggleTheme} title="Змінити тему">
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}