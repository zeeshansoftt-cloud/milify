import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1.25rem",
        md: "2rem",
        lg: "2.5rem",
      },
      screens: {
        sm: "640px",
        md: "768px",
        lg: "1024px",
        xl: "1200px",
        "2xl": "1200px",
      },
    },
    extend: {
      colors: {
        paper: "#F4F1EA",
        ink: {
          DEFAULT: "#141519",
          70: "#4A4C55",
          40: "#8A8C93",
        },
        rule: "#E1DED5",
        surface: "#FFFFFF",
        accent: {
          DEFAULT: "#14594A",
          soft: "#D7E3DD",
          deep: "#0E4439",
        },
        alert: "#B24A1E",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      fontSize: {
        "display-lg": ["clamp(44px, 7vw, 72px)", { lineHeight: "1.02", letterSpacing: "-0.02em" }],
        "display": ["clamp(40px, 6vw, 64px)", { lineHeight: "1.04", letterSpacing: "-0.02em" }],
        "h1": ["clamp(32px, 4.4vw, 48px)", { lineHeight: "1.08", letterSpacing: "-0.015em" }],
        "h2": ["clamp(24px, 3vw, 32px)", { lineHeight: "1.15", letterSpacing: "-0.01em" }],
        "h3": ["clamp(20px, 2.2vw, 24px)", { lineHeight: "1.2" }],
        "body-lg": ["17px", { lineHeight: "1.65" }],
        "body": ["16px", { lineHeight: "1.6" }],
        "small": ["14px", { lineHeight: "1.5" }],
        "caption": ["13px", { lineHeight: "1.4", letterSpacing: "0.02em" }],
      },
      borderRadius: {
        DEFAULT: "6px",
        lg: "8px",
        xl: "12px",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(20, 21, 25, 0.04), 0 2px 8px rgba(20, 21, 25, 0.04)",
        ring: "0 0 0 1px rgba(20, 21, 25, 0.08)",
      },
      transitionTimingFunction: {
        "out-soft": "cubic-bezier(0.2, 0.6, 0.2, 1)",
      },
      maxWidth: {
        content: "1200px",
        prose: "62ch",
      },
    },
  },
  plugins: [],
};

export default config;
