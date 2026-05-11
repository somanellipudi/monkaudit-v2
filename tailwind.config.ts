import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ivory: "#F6F1E8",
        paper: "#FFFCF6",
        stoneLine: "#E4D9C8",
        ink: "#1D1B18",
        muted: "#6B6257",
        monk: "#B96324",
        saffron: "#D88A33",
        sage: "#657760"
      },
      boxShadow: {
        calm: "0 18px 50px rgba(29, 27, 24, 0.06)"
      }
    }
  },
  plugins: []
};

export default config;
