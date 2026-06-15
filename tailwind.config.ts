import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#F7F5F0",
        surface: "#FFFFFF",
        "surface-muted": "#F2F0EA",
        border: "#DEDAD1",
        ink: "#24211D",
        muted: "#6F6A61",
        faint: "#9A948A",
        accent: "#2F5D62",
        "accent-soft": "#DCE9E7",
        warning: "#B7791F",
        success: "#3F6F4E",
        danger: "#A4493D"
      },
      boxShadow: {
        workspace: "0 1px 2px rgba(36, 33, 29, 0.05)"
      },
      fontFamily: {
        sans: ["var(--font-noto-sans-kr)", "system-ui", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;

