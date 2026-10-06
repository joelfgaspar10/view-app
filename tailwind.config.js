/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./index.{js,jsx,ts,tsx}",
    "./main.{js,jsx,ts,tsx}",
    "./src/components/**/*.{js,jsx,ts,tsx}",
    "./src/navigation/**/*.{js,jsx,ts,tsx}",
    "./src/screens/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: "#F3F4F6",
          dark: "#282534",
        },
        card: {
          DEFAULT: "#9CA3AF",
          dark: "#33415C",
        },
        button: {
          DEFAULT: "#9CA3AF",
          dark: "#2563EB",
        },
        blueButton: {
          DEFAULT: "#2563EB",
          dark: "#4361EE",
        },
        tabSelected: {
          DEFAULT: "#223A6A",
        },
        textBox: {
          DEFAULT: "#FFFFFF",
          dark: "#33415C",
        },
        text: {
          DEFAULT: "#000",
          dark: "#FFFFFF",
        },
        icon: {
          DEFAULT: "#64748B",
          dark: "#FFFFFF",
        },
      },
    },
  },
  darkMode: "class",
  plugins: [],
};

// "#FF5A5F" : "#2563EB"
