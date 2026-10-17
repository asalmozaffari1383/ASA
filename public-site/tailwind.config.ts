import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Vazirmatn",
          "Vazir",
          "IRANSans",
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        display: [
          "Estedad",
          "Vazirmatn",
          "Vazir",
          "IRANSans",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
      },
      colors: {
        // Monochrome tech — primary text and structural ink.
        ink: {
          DEFAULT: "#12283F",
          deep: "#0A1C30",
        },
        // Dark full-bleed blocks.
        carbon: "#0A1C30",
        graphite: "#17344E",
        // Zinc/stone neutral scale.
        steel: {
          DEFAULT: "#7C8B99",
          light: "#E2E8EF",
          dark: "#526477",
        },
        mist: "#F4F7FA",
        sky: "#D6D3D1",
        paper: "#FFFFFF",
        // Muted stone — subtle accent and logo companion.
        accent: {
          DEFAULT: "#90C4EA",
          dark: "#1C5E92",
          soft: "#EAF3FA",
        },
        slateGlass: "rgba(255,255,255,0.92)",
      },
      borderRadius: {
        // Moderate, modern-industrial scale — softened corners that read
        // engineered and precise, without returning to the old pill/cute look.
        none: "0",
        sm: "4px",
        DEFAULT: "6px",
        md: "8px",
        lg: "10px",
        xl: "12px",
        "2xl": "14px",
        "3xl": "16px",
        full: "9999px",
      },
      boxShadow: {
        soft: "0 2px 10px -4px rgba(24, 24, 27, 0.16)",
        card: "0 10px 30px -18px rgba(24, 24, 27, 0.34)",
        apple: "0 18px 48px -28px rgba(24, 24, 27, 0.4)",
        seal: "0 12px 30px -14px rgba(87, 83, 78, 0.38)",
        // Hard offset edge — a deliberate industrial motif.
        edge: "5px 5px 0 0 rgba(24, 24, 27, 0.9)",
        "edge-accent": "5px 5px 0 0 #A8A29E",
      },
      keyframes: {
        marquee: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-22px)" },
        },
      },
      animation: {
        marquee: "marquee 40s linear infinite",
        float: "float 14s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
