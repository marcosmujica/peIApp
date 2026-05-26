import React from "react";
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from "react-native";
import {
  Colors,
  BorderRadius,
  Spacing,
  FontFamily,
  FontSize,
  LineHeight,
} from "@/constants/theme";

/**
 * Button — updated to match Figma design tokens.
 *
 * Variants: primary | secondary | destructive | ghost | outline
 * Sizes:    sm | md | lg
 */

type ButtonVariant = "primary" | "secondary" | "destructive" | "ghost" | "outline";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, ViewStyle> = {
  primary: { backgroundColor: Colors.navigationActionButton },
  secondary: { backgroundColor: Colors.subtleSurface },
  destructive: { backgroundColor: Colors.destructive },
  ghost: { backgroundColor: Colors.transparent },
  outline: {
    backgroundColor: Colors.transparent,
    borderWidth: 1,
    borderColor: Colors.strokeSubtle,
  },
};

const labelColorStyles: Record<ButtonVariant, TextStyle> = {
  primary: { color: Colors.primaryForeground },
  secondary: { color: Colors.textPrimary },
  destructive: { color: Colors.destructiveForeground },
  ghost: { color: Colors.textPrimary },
  outline: { color: Colors.textPrimary },
};

const sizeStyles: Record<ButtonSize, ViewStyle> = {
  sm: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  md: { paddingHorizontal: Spacing.xl, paddingVertical: 14 },
  lg: { paddingHorizontal: Spacing.xxl, paddingVertical: Spacing.lg },
};

const labelSizeStyles: Record<ButtonSize, TextStyle> = {
  sm: { fontSize: FontSize.sm, lineHeight: LineHeight[16] },
  md: { fontSize: FontSize.base, lineHeight: LineHeight[18] },
  lg: { fontSize: FontSize.lg, lineHeight: LineHeight[24] },
};

export const Button: React.FC<ButtonProps> = ({
  label,
  onPress,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  style,
  textStyle,
  fullWidth = false,
  leftIcon,
  rightIcon,
}) => {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.75}
      style={[
        styles.base,
        variantStyles[variant],
        sizeStyles[size],
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={
            variant === "primary"
              ? Colors.primaryForeground
              : Colors.primary
          }
        />
      ) : (
        <>
          {leftIcon}
          <Text
            style={[
              styles.label,
              labelColorStyles[variant],
              labelSizeStyles[size],
              textStyle,
            ]}
          >
            {label}
          </Text>
          {rightIcon}
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: BorderRadius.button,
    gap: Spacing.sm,
  },
  fullWidth: {
    width: "100%",
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    fontFamily: FontFamily.bold,
    textAlign: "center",
  },
});
