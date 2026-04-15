import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        tertiary: "#52ffac",
        surface: "#000000",
        "surface-high": "#1a1a1a",
        "surface-highest": "#222222",
        "surface-variant": "#353535",
        "on-surface-variant": "#c6c6c6",
        "error-container": "#93000a",
        "on-error-container": "#ffdad6",
      },
    },
  },
  plugins: [],
};
export default config;
