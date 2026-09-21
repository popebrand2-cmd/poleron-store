import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-teko)", "Impact", "sans-serif"],
        script: ["var(--font-yellowtail)", "cursive"],
      },
      colors: {
        ink: "#111111",
        paper: "#fafaf9",
        // Brand accent — neon green on black by default, admin-editable via
        // the --neon CSS variable (see globals.css / layout.tsx). Utilities
        // using an opacity modifier (e.g. bg-neon/70) won't pick up the
        // custom color and should use an explicit rgba/hex value instead.
        neon: "var(--neon)",
      },
    },
  },
  plugins: [],
};

export default config;
