import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from "react-native";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";

/**
 * ListCard — container for list items (transactions, etc.)
 * Matches the Figma pattern with subtle background, rounded corners and padding.
 */

interface ListCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export const ListCard: React.FC<ListCardProps> = ({ children, style }) => {
  return (
    <View style={[styles.container, style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.subtleSurface,
    borderRadius: BorderRadius.card,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.lg,
    gap: Spacing.md,
    width: "100%",
  },
});
