import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Colors, FontFamily, FontSize, LineHeight, Spacing } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";

/**
 * SectionHeader — "Mis billeteras" / "Transacciones Pendientes" style.
 *
 * Matches Figma pattern: title on the left, optional "Ver todas >" on the right.
 */

interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  actionLabel,
  onAction,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>

      {actionLabel && onAction && (
        <TouchableOpacity
          style={styles.action}
          onPress={onAction}
          activeOpacity={0.6}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.actionLabel}>{actionLabel}</Text>
          <Ionicons
            name="chevron-forward"
            size={12}
            color={Colors.textSecondary}
            style={styles.actionIcon}
          />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  title: {
    fontFamily: FontFamily.semibold,
    fontSize: FontSize.lg,           // 17
    lineHeight: LineHeight[24],      // 24
    color: Colors.textPrimary,
  },
  action: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  actionLabel: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,           // 13
    lineHeight: LineHeight[16],      // 16
    color: Colors.textSecondary,
  },
  actionIcon: {
    marginTop: 1,
  },
});
