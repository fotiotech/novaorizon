import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class', // never add 'dark' class → no dark mode
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        white: "#ffffff",
        black: "#000000",
        blue: {
          DEFAULT: "#3b82f6",
          light: "#93c5fd",
          dark: "#1d4ed8",
        },
        orange: {
          DEFAULT: "#f97316",
          light: "#fb923c",
          dark: "#ea580c",
        },
        green: {
          DEFAULT: "#22c55e",
          light: "#4ade80",
          dark: "#16a34a",
        },
      },

      backgroundColor: {
        background: "rgb(var(--background) / <alpha-value>)",
        card: "rgb(var(--card) / <alpha-value>)",
        popover: "rgb(var(--popover) / <alpha-value>)",
        primary: "rgb(var(--primary) / <alpha-value>)",
        secondary: "rgb(var(--secondary) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        accent: "rgb(var(--accent) / <alpha-value>)",
        destructive: "rgb(var(--destructive) / <alpha-value>)",
        sidebar: "rgb(var(--sidebar) / <alpha-value>)",
      },
      textColor: {
        foreground: "rgb(var(--foreground) / <alpha-value>)",
        "card-foreground": "rgb(var(--card-foreground) / <alpha-value>)",
        "popover-foreground": "rgb(var(--popover-foreground) / <alpha-value>)",
        "primary-foreground": "rgb(var(--primary-foreground) / <alpha-value>)",
        "secondary-foreground": "rgb(var(--secondary-foreground) / <alpha-value>)",
        "muted-foreground": "rgb(var(--muted-foreground) / <alpha-value>)",
        "accent-foreground": "rgb(var(--accent-foreground) / <alpha-value>)",
        "destructive-foreground": "rgb(var(--destructive-foreground) / <alpha-value>)",
        "sidebar-foreground": "rgb(var(--sidebar-foreground) / <alpha-value>)",
      },
      borderColor: {
        border: "rgb(var(--border) / <alpha-value>)",
        input: "rgb(var(--input) / <alpha-value>)",
        // 👇 Added these so border-primary, border-secondary, border-accent work
        primary: "rgb(var(--primary) / <alpha-value>)",
        secondary: "rgb(var(--secondary) / <alpha-value>)",
        accent: "rgb(var(--accent) / <alpha-value>)",
        destructive: "rgb(var(--destructive) / <alpha-value>)",
        "sidebar-border": "rgb(var(--sidebar-border) / <alpha-value>)",
      },
      ringColor: {
        ring: "rgb(var(--ring) / <alpha-value>)",
      },
      outlineColor: {
        ring: "rgb(var(--ring) / <alpha-value>)",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [require("tailwind-scrollbar")],
};

export default config;