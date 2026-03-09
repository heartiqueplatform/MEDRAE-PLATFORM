import type { Config } from "tailwindcss";

export default {
  darkMode: "class",

  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],

  safelist: [
    "bg-green-300",
    "dark:bg-green-800",
    "bg-[#FF4C4C]",
    "dark:bg-[#800000]"
  ],

  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      backgroundImage: {
        "gradient-medical": "var(--gradient-medical)",
        "gradient-healing": "var(--gradient-healing)",
        "gradient-warm": "var(--gradient-warm)",
        "gradient-hero": "var(--gradient-hero)",
      },
      boxShadow: {
        medical: "var(--shadow-medical)",
        soft: "var(--shadow-soft)",
        glow: "var(--shadow-glow)",
      },
      transitionProperty: {
        smooth: "var(--transition-smooth)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },

      /* ----------------------------- */
      /* ⭐ COMBINED KEYFRAMES         */
      /* ----------------------------- */
      keyframes: {

        ecg: {
          "0%": { strokeDashoffset: "1200" },
          "100%": { strokeDashoffset: "0" },
        },

        spinMotor: {
          "0%": { transform: "rotate(0deg)" },
          "25%": { transform: "rotate(20deg)" },
          "50%": { transform: "rotate(0deg)" },
          "75%": { transform: "rotate(-20deg)" },
          "100%": { transform: "rotate(0deg)" },
        },


        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        marquee: {
          "0%": { transform: "translateX(0%)" },
          "100%": { transform: "translateX(-100%)" },
        },
        "marquee-reverse": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(0%)" },
        },
        // Emoji pop + wiggle
        "emoji-zoom-bounce": {
          "0%": { transform: "scale(0) rotate(0deg)", opacity: "0" },
          "40%": { transform: "scale(1.8) rotate(-15deg)", opacity: "1" },
          "60%": { transform: "scale(1.4) rotate(10deg)" },
          "80%": { transform: "scale(1.6) rotate(-5deg)" },
          "100%": { transform: "scale(1) rotate(0deg)", opacity: "1" },
        },

        "scale-up": {
          "0%": { transform: "scale(0.9)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },

      /* ----------------------------- */
      /* ⭐ COMBINED ANIMATIONS         */
      /* ----------------------------- */
      animation: {

        ecg: "ecg 3s linear infinite",

        spinMotor: "spinMotor 0.5s linear infinite",
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        marquee: "marquee 20s linear infinite",
        "marquee-fast": "marquee 10s linear infinite",
        "marquee-slow": "marquee 40s linear infinite",
        "marquee-reverse": "marquee-reverse 20s linear infinite",
        pop: "pop 0.6s ease forwards",
        "emoji-zoom": "emoji-zoom-bounce 0.8s ease-out forwards",
        "scale-up": "scale-up 0.3s ease-out forwards",
        'spin-slow': 'spin 1s linear infinite',
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("tailwind-scrollbar")],
} satisfies Config;
