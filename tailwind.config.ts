import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: "#0a0e27",
        darker: "#050810",
        accent: "#3b82f6",
      },
      fontFamily: {
        sans: ["system-ui", "-apple-system", "sans-serif"],
        display: ["SF Pro Display", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
