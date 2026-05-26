import React from "react";
import { View, Text, StyleSheet } from "react-native";
import {
  Colors,
  BorderRadius,
  Spacing,
  FontFamily,
  FontSize,
} from "@/constants/theme";
import type { TicketStatus } from "@/constants/theme";

/**
 * Badge — status indicator updated to match Figma color tokens.
 *
 * Uses Alerts/Success and Alerts/Warning from Figma.
 */

type BadgeVariant = "pending" | "paid" | "overdue" | "default";

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  status?: TicketStatus;
}

const statusToVariant: Record<TicketStatus, BadgeVariant> = {
  pending: "pending",
  confirmed: "paid",
  overdue: "overdue",
};

const variantConfig: Record<
  BadgeVariant,
  { bg: string; text: string; dot: string }
> = {
  pending: {
    bg: "#FEF3C7",
    text: "#92400E",
    dot: Colors.alertsWarning,
  },
  paid: {
    bg: "#DCFCE7",
    text: "#14532D",
    dot: Colors.alertsSuccess,
  },
  overdue: {
    bg: "#FEE2E2",
    text: "#7F1D1D",
    dot: Colors.ticketOverdue,
  },
  default: {
    bg: Colors.subtleSurface,
    text: Colors.textSecondary,
    dot: Colors.textSecondary,
  },
};

export const Badge: React.FC<BadgeProps> = ({ label, variant, status }) => {
  const resolvedVariant: BadgeVariant =
    variant ?? (status ? statusToVariant[status] : "default");
  const config = variantConfig[resolvedVariant];

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <View style={[styles.dot, { backgroundColor: config.dot }]} />
      <Text style={[styles.label, { color: config.text }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.badge,
    gap: Spacing.xs,
    alignSelf: "flex-start",
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs, // 12
  },
});
