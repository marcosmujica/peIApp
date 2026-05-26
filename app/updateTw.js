const fs = require('fs');

const twConfigPath = './tailwind.config.js';
let config = fs.readFileSync(twConfigPath, 'utf8');

// The original colors string block to replace
const originalColors = `        // ── Brand ──
        primary: {
          DEFAULT: "#143327",       // sage-900
          light: "#d6ede5",         // sage-light
          dark: "#274d3c",          // sage-800
          foreground: "#FFFFFF",
        },

        // ── Accent (Lavender) ──
        accent: {
          DEFAULT: "#7465b5",       // lavender-600
          light: "#e3ddf5",         // lavender-100
          soft: "#f3f0fb",          // lavender-50
          foreground: "#1a1a1a",
        },

        // ── Surfaces ──
        background: "#f7f6f3",      // warm beige
        surface: {
          DEFAULT: "#ffffff",
          alt: "#eceae3",           // greyscale-100
          muted: "#f4f3ee",         // greyscale-50
          subtle: "#f7f6f3",        // alias
        },
        foreground: "#1a1a1a",

        // ── Text ──
        text: {
          primary: "#1a1a1a",
          secondary: "#6b6b6b",
          tertiary: "#a8a69e",
          accent: "#c4b5e8",
        },

        // ── Semantic ──
        success: {
          DEFAULT: "#3a9e76",
          surface: "#d6f0e8",
        },
        warning: {
          DEFAULT: "#b8862a",
          surface: "#fbf0d8",
        },
        destructive: {
          DEFAULT: "#DC2626",
          soft: "#FEF2F2",
          foreground: "#FAFAFA",
        },
        error: "#c05050",

        // ── Stroke ──
        border: "#eceae3",
        input: "#d8d6ce",
        ring: "#143327",
        stroke: {
          subtle: "#eceae3",
          default: "#d8d6ce",
        },

        // ── Navigation ──
        nav: {
          active: "#1a1a1a",
          inactive: "#a8a69e",
          border: "#eceae3",
          fab: "#143327",
        },

        // ── Greyscale ──
        grey: {
          50: "#f4f3ee",
          100: "#eceae3",
          200: "#d8d6ce",
          600: "#6b6b6b",
          800: "#2e2e2e",
          900: "#1a1a1a",
        },

        // ── Ticket status ──
        ticket: {
          pending: "#b8862a",
          paid: "#3a9e76",
          overdue: "#DC2626",
        },

        // ── Legacy aliases ──
        secondary: {
          DEFAULT: "#f7f6f3",
          foreground: "#1a1a1a",
        },
        muted: {
          DEFAULT: "#f7f6f3",
          foreground: "#6b6b6b",
        },`;

const replacementColors = `        // ── Variables mapped to global.css ──
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
        },`;

if(config.includes("primary: {")) {
  config = config.replace(originalColors, replacementColors);
  fs.writeFileSync(twConfigPath, config);
  console.log('tailwind config updated.');
} else {
  console.log('tailwind config already updated or pattern not found.');
}
