/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#14213d",
        coral: "#f26b5b",
        sand: "#f5f0e8",
        mist: "#e8eef5",
      },
      fontFamily: {
        display: ["var(--font-space-grotesk)", "sans-serif"],
        sans: ["var(--font-inter)", "sans-serif"],
      },
      boxShadow: {
        soft: "0 18px 55px rgba(20, 33, 61, 0.12)",
      },
    },
  },
  plugins: [],
};
