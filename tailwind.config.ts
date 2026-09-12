import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#111111",
        paper: "#fafaf9",
        // Brand accent — neon green on black, replacing the earlier purple/fuchsia accent.
        neon: "#39FF14",
      },
    },
  },
  plugins: [],
};

export default config;
