/** @type {import('tailwindcss').Config} */

/**
 * Fina Design System — Tailwind Config
 * ═══════════════════════════════════════
 * Synchronized with src/constants/theme.ts
 *
 * All values here MUST match the TypeScript tokens.
 * If you change a color/spacing in theme.ts, update it here too.
 */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // ── Variables mapped to global.css ──
        primary: {
          DEFAULT: "var(--color-primary)",
          light: "var(--color-primary-light)",
          dark: "var(--color-primary-dark)",
          foreground: "var(--color-primary-fg)",
        },
        accent: {
          DEFAULT: "var(--color-accent)",
          light: "var(--color-accent-light)",
          soft: "var(--color-accent-soft)",
          foreground: "var(--color-accent-fg)",
        },
        background: "var(--color-background)",
        surface: {
          DEFAULT: "var(--color-surface)",
          alt: "var(--color-surface-alt)",
          muted: "var(--color-surface-muted)",
          subtle: "var(--color-surface-subtle)",
        },
        foreground: "var(--color-foreground)",
        text: {
          primary: "var(--color-text-primary)",
          secondary: "var(--color-text-secondary)",
          tertiary: "var(--color-text-tertiary)",
          accent: "var(--color-text-accent)",
        },
        success: {
          DEFAULT: "var(--color-success)",
          surface: "var(--color-success-surface)",
        },
        warning: {
          DEFAULT: "var(--color-warning)",
          surface: "var(--color-warning-surface)",
        },
        destructive: {
          DEFAULT: "var(--color-destructive)",
          soft: "var(--color-destructive-soft)",
          foreground: "var(--color-destructive-fg)",
        },
        error: "var(--color-error)",
        border: "var(--color-border)",
        input: "var(--color-input)",
        ring: "var(--color-ring)",
        stroke: {
          subtle: "var(--color-stroke-subtle)",
          default: "var(--color-stroke-default)",
        },
        nav: {
          active: "var(--color-nav-active)",
          inactive: "var(--color-nav-inactive)",
          border: "var(--color-nav-border)",
          fab: "var(--color-nav-fab)",
        },
        grey: {
          50: "var(--color-grey-50)",
          100: "var(--color-grey-100)",
          200: "var(--color-grey-200)",
          600: "var(--color-grey-600)",
          800: "var(--color-grey-800)",
          900: "var(--color-grey-900)",
        },
        ticket: {
          pending: "var(--color-ticket-pending)",
          paid: "var(--color-ticket-paid)",
          overdue: "var(--color-ticket-overdue)",
        },
        secondary: {
          DEFAULT: "var(--color-secondary)",
          foreground: "var(--color-secondary-fg)",
        },
        muted: {
          DEFAULT: "var(--color-muted)",
          foreground: "var(--color-muted-fg)",
        },
      },

      // ── Border Radius ──
      borderRadius: {
        sm: "4px",          // Radius/4
        md: "8px",          // Radius/8
        input: "12px",      // Radius/12
        button: "12px",     // Radius/12
        lg: "16px",         // Radius/16
        card: "20px",       // Radius/20 — premium feel
        xl: "24px",         // Radius/24
        sheet: "24px",      // Bottom sheets
        navbar: "13px",     // FAB
        badge: "8px",       // Status badges
        full: "1000px",     // Pills, avatars
      },

      // ── Spacing ──
      spacing: {
        xs: "4px",
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "20px",
        "2xl": "24px",
        "3xl": "32px",
        giant: "72px",
      },

      // ── Font Family ──
      fontFamily: {
        sans: ["PlusJakarta-Regular", "sans-serif"],
        medium: ["PlusJakarta-Medium", "sans-serif"],
        heading: ["PlusJakarta-SemiBold", "sans-serif"],
        bold: ["PlusJakarta-Bold", "sans-serif"],
      },

      // ── Font Size ──
      fontSize: {
        xs: ["12px", { lineHeight: "16px" }],      // Caption
        sm: ["13px", { lineHeight: "16px" }],      // Label/Small
        base: ["15px", { lineHeight: "18px" }],    // Label/Base
        lg: ["17px", { lineHeight: "24px" }],      // H3
        xl: ["20px", { lineHeight: "28px" }],      // H2
        "2xl": ["24px", { lineHeight: "28px" }],
        "3xl": ["28px", { lineHeight: "32px" }],
        "4xl": ["32px", { lineHeight: "32px" }],   // H1
      },

      // ── Box Shadow ──
      boxShadow: {
        card: "0 1px 8px rgba(20, 51, 39, 0.04)",
        elevated: "0 4px 16px rgba(20, 51, 39, 0.08)",
        fab: "0 4px 12px rgba(20, 51, 39, 0.25)",
      },
    },
  },
  plugins: [],
};
