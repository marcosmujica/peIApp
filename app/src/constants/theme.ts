/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  Fina Design System — "Calma Financiera"                                   ║
 * ║                                                                            ║
 * ║  Portable theme tokens extracted from Figma (UI canvas id: 71:1054).       ║
 * ║  This file is the SINGLE SOURCE OF TRUTH for all visual decisions.         ║
 * ║                                                                            ║
 * ║  Font: Plus Jakarta Sans (Regular 400, Medium 500, SemiBold 600, Bold 700) ║
 * ║  Palette: Warm beige base with dark sage green primary                     ║
 * ║                                                                            ║
 * ║  To port this to another project:                                          ║
 * ║    1. Copy this file into your new project's constants/ folder             ║
 * ║    2. Update font family names if using a different font loader            ║
 * ║    3. All components that import from @/constants/theme will just work     ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

import { Platform } from "react-native";

// ─── Colors ──────────────────────────────────────────────────────────────────

export const Colors = {
  // ── Brand ──
  // The core identity of the app. Sage green conveys trust and calm.
  primary: "#196342",               // Sage 900 — CTAs, navigation active, FAB
  primaryLight: "#d6ede5",          // Sage Light — positive surfaces
  primaryDark: "#274d3c",           // Sage 800 — hover/pressed states
  primaryForeground: "#FFFFFF",     // Text on primary backgrounds

  // ── Accent ──
  // Lavender tones used for informational/AI elements. Never decorative.
  accent: "#7465b5",                // Lavender 600 — interactive accents
  accentLight: "#e3ddf5",           // Lavender 100 — insight pills, icon bgs
  accentSoft: "#f3f0fb",           // Lavender 50 — ultra-soft backgrounds

  // ── Surfaces ──
  // The "canvas" of the app. Warm tones reduce visual fatigue.
  background: "#f7f6f3",            // Warm Beige — main app background
  surface: "#ffffff",               // White — elevated cards, modals
  surfaceAlt: "#eceae3",            // Greyscale 100 — alternative surface
  subtleSurface: "#f7f6f3",         // Alias for background (card fill)
  surfaceMuted: "#f4f3ee",          // Greyscale 50 — ultra-subtle surface
  cardBackground: "#ffffff",        // Card elevated background

  // ── Text ──
  // 3-level hierarchy. Never use more than 3 levels per screen.
  textPrimary: "#1a1a1a",           // Titles, amounts, primary content
  textSecondary: "#6b6b6b",         // Labels, descriptions, metadata
  textTertiary: "#a8a69e",          // Placeholders, inactive nav, hints
  textAccent: "#c4b5e8",           // Accent text on dark backgrounds

  // ── Semantic ──
  // Colors always carry meaning. Never decorative.
  alertsSuccess: "#3a9e76",         // Ingresos, confirmaciones, positivo
  alertsSuccessSurface: "#d6f0e8",  // Badge background for success
  alertsWarning: "#b8862a",         // Próximo a vencer, atención moderada
  alertsWarningSoft: "#fbf0d8",     // Badge background for warning
  alertsError: "#c05050",           // Vencido, error, urgente
  destructive: "#DC2626",           // Delete actions
  destructiveSoft: "#FEF2F2",       // Destructive surface
  destructiveForeground: "#FAFAFA", // Text on destructive

  // ── Status Aliases ──
  statusSuccessText: "#3a9e76",
  statusWarningText: "#b8862a",

  // ── Stroke & Borders ──
  strokeSubtle: "#eceae3",          // Dividers, card borders (subtle)
  strokeDefault: "#d8d6ce",         // Input borders, stronger dividers
  inputBorder: "#d8d6ce",           // Form input borders
  border: "#eceae3",                // General border alias

  // ── Navigation ──
  navigationActionButton: "#196342",  // FAB background
  navigationTabInactive: "#a8a69e",   // Inactive tab icon/text
  navigationBarBorder: "#eceae3",     // Top border of tab bar

  // ── Greyscale ──
  greyscale900: "#1a1a1a",
  greyscale800: "#2e2e2e",
  greyscale100: "#eceae3",
  greyscale50: "#f4f3ee",

  // ── Utility ──
  white: "#FFFFFF",
  transparent: "transparent",

  // ── Legacy aliases (backward compat with existing components) ──
  foreground: "#1a1a1a",
  secondary: "#f7f6f3",
  secondaryForeground: "#1a1a1a",
  muted: "#f7f6f3",
  mutedForeground: "#6b6b6b",
  accentForeground: "#1a1a1a",
  input: "#d8d6ce",
  ring: "#143327",
  brandPrimaryLight: "#d6ede5",
  brandAccentLight: "#e3ddf5",
  accentLavender100: "#e3ddf5",

  // ── Ticket status ──
  ticketPending: "#b8862a",
  ticketPaid: "#3a9e76",
  ticketOverdue: "#DC2626",
} as const;

// ─── Typography ──────────────────────────────────────────────────────────────

/**
 * Font family: Plus Jakarta Sans
 * Loaded in App.tsx via @expo-google-fonts/plus-jakarta-sans
 *
 * To port to another project:
 *   - If using Figtree: change all values to "Figtree-Regular", etc.
 *   - If using Inter: change to "Inter_400Regular", etc.
 *   - The key names stay the same, only values change.
 */
export const FontFamily = {
  regular: "PlusJakarta-Regular",     // 400
  medium: "PlusJakarta-Medium",       // 500
  semibold: "PlusJakarta-SemiBold",   // 600
  bold: "PlusJakarta-Bold",           // 700
  mono: "PlusJakarta-Regular",        // Fallback
} as const;

/**
 * Font sizes from Figma Typography/Size tokens.
 *
 * UX Rule: Each screen uses max 3 levels:
 *   - Hero (4xl/32px) → The main number/balance
 *   - Section (lg/17px) → Section titles
 *   - Detail (sm/13px or xs/12px) → Metadata, labels
 */
export const FontSize = {
  xs: 12,     // Caption — dates, metadata
  sm: 13,     // Label/Small, Body/Small — chips, tags
  base: 15,   // Label/Base — body text, button labels
  lg: 17,     // Heading/H3 — section titles, wallet names
  xl: 20,     // Heading/H2 — greetings, screen titles
  "2xl": 24,  // Large emphasis
  "3xl": 28,  // Extra large
  "4xl": 32,  // Heading/H1 — balance, hero numbers
} as const;

/** Line heights from Figma Typography/LineHeight tokens */
export const LineHeight = {
  14: 14,     // Overline
  16: 16,     // Caption, Label/Small
  18: 18,     // Label/Base
  20: 20,     // Body/Small, Label/Large
  22: 22,     // H4
  24: 24,     // H3, Body/Base
  26: 26,     // Body/Large Strong
  28: 28,     // H2
  32: 32,     // H1
} as const;

/**
 * Named text styles matching Figma's typography tokens.
 *
 * Every style corresponds 1:1 to a Figma text style.
 * Components should ONLY use these — never ad-hoc font combos.
 */
export const TextStyles = {
  /** Heading/H1 — SemiBold 32/32. Use ONLY for hero numbers (balance). */
  headingH1: {
    fontFamily: FontFamily.semibold,
    fontSize: FontSize["4xl"],       // 32
    lineHeight: LineHeight[32],
    letterSpacing: -0.5,
    color: Colors.textPrimary,
  },
  /** Heading/H2 — SemiBold 20/28. ONLY for greetings & screen titles. */
  headingH2: {
    fontFamily: FontFamily.semibold,
    fontSize: FontSize.xl,           // 20
    lineHeight: LineHeight[28],
    color: Colors.textPrimary,
  },
  /** Heading/H3 — SemiBold 17/24. Section titles ("Mis billeteras"). */
  headingH3: {
    fontFamily: FontFamily.semibold,
    fontSize: FontSize.lg,           // 17
    lineHeight: LineHeight[24],
    color: Colors.textPrimary,
  },
  /** Heading/H4 — SemiBold 15/22. Strong labels. */
  headingH4: {
    fontFamily: FontFamily.semibold,
    fontSize: FontSize.base,         // 15
    lineHeight: LineHeight[22],
    color: Colors.textPrimary,
  },
  /** Body/Large Strong — SemiBold 17/26. Wallet amounts in cards. */
  bodyLargeStrong: {
    fontFamily: FontFamily.semibold,
    fontSize: FontSize.lg,           // 17
    lineHeight: LineHeight[26],
    color: Colors.textPrimary,
  },
  /** Body/Large — Regular 17/24. */
  bodyLarge: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.lg,
    lineHeight: LineHeight[24],
    color: Colors.textPrimary,
  },
  /** Body/Base — Regular 15/20. General body text. */
  bodyBase: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    lineHeight: LineHeight[20],
    color: Colors.textPrimary,
  },
  /** Body/Base Strong — SemiBold 15/24. */
  bodyBaseStrong: {
    fontFamily: FontFamily.semibold,
    fontSize: FontSize.base,         // 15
    lineHeight: LineHeight[24],
    color: Colors.textPrimary,
  },
  /** Body/Small Strong — SemiBold 13/20. Transaction titles. */
  bodySmallStrong: {
    fontFamily: FontFamily.semibold,
    fontSize: FontSize.sm,           // 13
    lineHeight: LineHeight[20],
    color: Colors.textPrimary,
  },
  /** Body/Small — Regular 13/20. */
  bodySmall: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    lineHeight: LineHeight[20],
    color: Colors.textPrimary,
  },
  /** Label/Base — SemiBold 15/18. Button labels, strong labels. */
  labelBase: {
    fontFamily: FontFamily.semibold,
    fontSize: FontSize.base,         // 15
    lineHeight: LineHeight[18],
    color: Colors.textPrimary,
  },
  /** Label/Large — SemiBold 17/20. Tab bar labels (active). */
  labelLarge: {
    fontFamily: FontFamily.semibold,
    fontSize: FontSize.lg,           // 17
    lineHeight: LineHeight[20],
    color: Colors.textPrimary,
  },
  /** Label/Small — Medium 13/16. Chips, tags, nav labels. */
  labelSmall: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,           // 13
    lineHeight: LineHeight[16],
    color: Colors.textSecondary,
  },
  /** Label/XSmall — Medium 11/14. Overlines, small badges. */
  labelXSmall: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    lineHeight: LineHeight[14],
    color: Colors.textSecondary,
  },
  /** Caption/Base — Regular 12/16. Dates, metadata, subtitles. */
  captionBase: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,           // 12
    lineHeight: LineHeight[16],
    color: Colors.textSecondary,
  },
  /** Overline/Base — SemiBold 11/14. Category badges, overline text. */
  overlineBase: {
    fontFamily: FontFamily.semibold,
    fontSize: 11,
    lineHeight: LineHeight[14],
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
} as const;

// ─── Spacing ─────────────────────────────────────────────────────────────────

/**
 * Spacing scale from Figma Spacing tokens.
 *
 * UX Rule:
 *   - xl (24px) → Horizontal page margins
 *   - xxxl (32px) → Gap between major sections
 *   - lg (16px) → Card internal padding
 *   - md (12px) → Gap between list items
 */
export const Spacing = {
  0: 0,
  2: 2,        // Micro gaps (text + icon)
  xs: 4,       // Spacing/4 — inner element gaps
  sm: 8,       // Spacing/8 — tight padding
  md: 12,      // Spacing/12 — item gaps
  lg: 16,      // Spacing/16 — card padding, section spacing
  xl: 20,      // Spacing/20 — medium spacing
  xxl: 24,     // Spacing/24 — page horizontal margins
  28: 28,      // Spacing/28 — specific spacing
  xxxl: 32,    // Spacing/32 — section gaps
  giant: 72,   // Spacing/72 — oversized gaps
} as const;

// ─── Border Radius ───────────────────────────────────────────────────────────

/**
 * Border radius from Figma Radius tokens.
 *
 * UX Rule:
 *   - card (20px) → All cards use this for premium feel
 *   - button (12px) → Modern, not fully rounded
 *   - full (1000px) → Avatars, pills, chips
 */
export const BorderRadius = {
  none: 0,      // Radius/0
  sm: 4,        // Radius/4 — tiny radius
  md: 8,        // Radius/8 — inputs, badges, icon containers
  input: 12,    // Radius/12 — form inputs
  button: 1000, // Radius/1000 — buttons (pill)
  lg: 16,       // Radius/16 — standard cards
  card: 20,     // Radius/20 — elevated premium cards
  xl: 24,       // Radius/24 — bottom sheets
  xxl: 32,      // Radius/32 — extra round
  badge: 8,     // Radius/8 — status badges
  sheet: 24,    // Radius/24 — bottom sheet top corners
  icon: 8.25,   // Icon container (Figma specific)
  navbar: 13,   // NavBar FAB button
  full: 1000,   // Radius/1000 — pills, avatars, chips
} as const;

// ─── Shadows ─────────────────────────────────────────────────────────────────

/**
 * Shadow tokens. Uses sage-tinted shadows for brand coherence.
 * All shadows use the primary color (#143327) as base for warmth.
 */
export const Shadows = {
  /** Subtle card shadow — for cards resting on surface */
  card: Platform.select({
    web: { boxShadow: "0px 1px 8px rgba(20, 51, 39, 0.04)" },
    default: {
      shadowColor: "#143327",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 2,
    }
  }) as any,
  /** Elevated card — modals, popovers, bottom sheets */
  cardElevated: Platform.select({
    web: { boxShadow: "0px 4px 16px rgba(20, 51, 39, 0.08)" },
    default: {
      shadowColor: "#143327",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
      elevation: 4,
    }
  }) as any,
  /** Bottom sheet shadow */
  sheet: Platform.select({
    web: { boxShadow: "0px -4px 12px rgba(20, 51, 39, 0.08)" },
    default: {
      shadowColor: "#143327",
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 8,
    }
  }) as any,
  /** Tab bar shadow */
  tabBar: Platform.select({
    web: { boxShadow: "0px -1px 8px rgba(20, 51, 39, 0.04)" },
    default: {
      shadowColor: "#143327",
      shadowOffset: { width: 0, height: -1 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 10,
    }
  }) as any,
  /** FAB button shadow */
  fab: Platform.select({
    web: { boxShadow: "0px 4px 12px rgba(20, 51, 39, 0.25)" },
    default: {
      shadowColor: "#143327",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 12,
      elevation: 8,
    }
  }) as any,
  /** Signature Sage Shadow — for major CTAs and action buttons */
  sage: Platform.select({
    web: { boxShadow: "0px 8px 16px rgba(20, 51, 39, 0.12)" },
    default: {
      shadowColor: "#143327",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 8,
    }
  }) as any,
} as const;

// ─── UX Constants ────────────────────────────────────────────────────────────

/**
 * UX rules codified as constants.
 * These enforce the "Calma Financiera" philosophy.
 */
export const UXRules = {
  /** Max content blocks visible above the fold */
  maxBlocksAboveFold: 3,

  /** Mini wallet card dimensions */
  walletCardSize: { width: 140, height: 140 },

  /** Avatar sizes */
  avatarSizes: {
    sm: 28,     // Small inline avatars
    md: 33,     // Transaction items, wallet card icons
    lg: 44,     // Profile, detail views
    xl: 64,     // Hero profile
  },

  /** NavBar FAB dimensions */
  fabSize: { width: 50, height: 50, borderRadius: 16 },
} as const;

// ─── Wallet type language mappings ───────────────────────────────────────────

/**
 * Micro-copy rules for wallet types.
 *
 * UX Rule: Always use conversational language.
 *   ❌ "Ingresos: $42.000"
 *   ✅ "Ganaste $42.000"
 */
export const WalletLanguage = {
  personal: {
    income: "Lo que entraste",
    expense: "Lo que gastaste",
    balance: "Tu saldo",
    fixedCost: "Lo que pagás siempre",
    profit: "Lo que te queda",
  },
  business: {
    income: "Ingresos del mes",
    expense: "Egresos del mes",
    balance: "Saldo del negocio",
    fixedCost: "Costos fijos",
    profit: "Ganancia neta",
  },
  shared: {
    income: "Ingresos compartidos",
    expense: "Gastos compartidos",
    balance: "Saldo compartido",
    fixedCost: "Lo que pagamos siempre",
    profit: "Lo que queda",
  },
} as const;

// ─── Exported Types ──────────────────────────────────────────────────────────

export type WalletType = keyof typeof WalletLanguage;
export type TicketStatus = "pending" | "confirmed" | "overdue";
export type WalletRole = "owner" | "admin" | "operator" | "viewer";
