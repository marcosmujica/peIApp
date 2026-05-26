import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import {
  Colors,
  FontFamily,
  FontSize,
  LineHeight,
  Spacing,
  BorderRadius,
} from "@/constants/theme";
import { Divider } from "./Divider";

/**
 * BalanceCard — matches Figma's main "Saldo total" card pattern.
 *
 *  ┌──────────────────────────────────┐
 *  │  Saldo total              label  │
 *  │  $99.750                  value  │
 *  │  ─────────────────────────       │
 *  │  ✓ Ganaste +$42.000   ⊖ Te deben│
 *  └──────────────────────────────────┘
 */

interface BalanceCardProps {
  /** Label above the balance (e.g. "Saldo total") */
  label?: string;
  /** Formatted balance (e.g. "$99.750") */
  balance: string;
  /** Left stat icon + text */
  leftStat?: {
    icon?: React.ReactNode;
    label: string;
    value: string;
  };
  /** Right stat icon + text */
  rightStat?: {
    icon?: React.ReactNode;
    label: string;
    value: string;
  };
  /** Optional footer node (e.g. AI summary) */
  footer?: React.ReactNode;
  style?: ViewStyle;
}

export const BalanceCard: React.FC<BalanceCardProps> = ({
  label = "Saldo total",
  balance,
  leftStat,
  rightStat,
  footer,
  style,
}) => {
  return (
    <View style={[styles.outerWrapper, style]}>
      {/* Main card */}
      <View style={styles.card}>
        <View style={styles.body}>
          {/* Top section */}
          <View style={styles.topSection}>
            {/* Label + balance */}
            <Text style={styles.label}>{label}</Text>
            <Text style={styles.balance}>{balance}</Text>
          </View>

          {/* Stats row */}
          {(leftStat || rightStat) && (
            <>
              <Divider />
              <View style={styles.statsRow}>
                {leftStat && (
                  <View style={styles.stat}>
                    {leftStat.icon}
                    <Text style={styles.statLabel}>{leftStat.label}</Text>
                    <Text style={styles.statValue}>{leftStat.value}</Text>
                  </View>
                )}
                {rightStat && (
                  <View style={styles.stat}>
                    {rightStat.icon}
                    <Text style={styles.statLabel}>{rightStat.label}</Text>
                    <Text style={styles.statValue}>{rightStat.value}</Text>
                  </View>
                )}
              </View>
            </>
          )}
        </View>
      </View>

      {/* Footer (AI summary, pinned below card) */}
      {footer && (
        <View style={styles.footer}>{footer}</View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  outerWrapper: {
    width: "100%",
    paddingBottom: Spacing.xl, // space for footer overlap
  },
  card: {
    backgroundColor: Colors.subtleSurface,
    borderRadius: BorderRadius.card,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.lg,
    zIndex: 2,
  },
  body: {
    gap: Spacing.md,
  },
  topSection: {
    gap: Spacing.md,
  },
  label: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    lineHeight: LineHeight[16],
    color: Colors.textSecondary,
  },
  balance: {
    fontFamily: FontFamily.semibold,
    fontSize: FontSize["4xl"],
    lineHeight: LineHeight[32],
    color: Colors.textPrimary,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.xs,
  },
  stat: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  statLabel: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    lineHeight: LineHeight[16],
    color: Colors.textSecondary,
  },
  statValue: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    lineHeight: LineHeight[16],
    color: Colors.textPrimary,
  },
  footer: {
    backgroundColor: Colors.brandAccentLight,
    borderBottomLeftRadius: BorderRadius.card,
    borderBottomRightRadius: BorderRadius.card,
    borderTopRightRadius: 10,
    paddingTop: Spacing[28],
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.xxl,
    marginTop: -Spacing.xl,
    zIndex: 1,
  },
});
