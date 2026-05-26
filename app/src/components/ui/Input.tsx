import React, { useState } from "react";
import {
  TextInput,
  View,
  Text,
  StyleSheet,
  TextInputProps,
  ViewStyle,
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
 * Input — updated to match Figma design tokens.
 *
 * Stroke uses strokeSubtle, focus uses primary (dark green),
 * and typography uses Figma's Caption/Label styles.
 */

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  containerStyle?: ViewStyle;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  hint,
  containerStyle,
  leftIcon,
  rightIcon,
  style,
  ...rest
}) => {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View
        style={[
          styles.inputWrapper,
          focused && styles.focused,
          !!error && styles.error,
        ]}
      >
        {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}
        <TextInput
          style={[styles.input, leftIcon ? styles.withLeftIcon : null, style]}
          placeholderTextColor={Colors.textSecondary}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...rest}
        />
        {rightIcon && <View style={styles.iconRight}>{rightIcon}</View>}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
      {hint && !error && <Text style={styles.hintText}>{hint}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: Spacing.xs,
    width: "100%",
  },
  label: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,          // 13
    lineHeight: LineHeight[16],
    color: Colors.textPrimary,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.strokeSubtle,
    borderRadius: BorderRadius.input,
    backgroundColor: Colors.surface,
    alignSelf: 'stretch',
  },
  focused: {
    borderColor: Colors.primary,
  },
  error: {
    borderColor: Colors.destructive,
  },
  input: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,         // 15
    lineHeight: LineHeight[18],
    color: Colors.textPrimary,
    // @ts-ignore
    outlineStyle: "none",
  },
  withLeftIcon: {
    paddingLeft: 0,
  },
  iconLeft: {
    paddingLeft: Spacing.md,
  },
  iconRight: {
    paddingRight: Spacing.md,
  },
  errorText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,           // 12
    lineHeight: LineHeight[16],
    color: Colors.destructive,
  },
  hintText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,           // 12
    lineHeight: LineHeight[16],
    color: Colors.textSecondary,
  },
});
