import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Colors, Spacing, FontFamily, FontSize } from "@/constants/theme";
import { Button } from "./Button";

interface EmptyStateProps {
  icon?: string;
  title: string;
  description: string;
  ctaLabel?: string;
  onCta?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = "💡",
  title,
  description,
  ctaLabel,
  onCta,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {ctaLabel && onCta && (
        <Button label={ctaLabel} onPress={onCta} style={styles.cta} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xxxl,
    gap: Spacing.md,
  },
  icon: {
    fontSize: 48,
    marginBottom: Spacing.sm,
  },
  title: {
    fontFamily: FontFamily.semibold,
    fontSize: FontSize.lg,
    color: Colors.foreground,
    textAlign: "center",
  },
  description: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.mutedForeground,
    textAlign: "center",
    lineHeight: 20,
  },
  cta: {
    marginTop: Spacing.sm,
  },
});
