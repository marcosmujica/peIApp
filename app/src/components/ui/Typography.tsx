import React from "react";
import { Text, TextProps, TextStyle } from "react-native";
import { TextStyles } from "@/constants/theme";

/**
 * Typography component based on Figma design tokens.
 */

export type TypographyVariant = keyof typeof TextStyles;

interface TypographyProps extends TextProps {
  variant?: TypographyVariant;
  color?: string;
  align?: TextStyle["textAlign"];
  uppercase?: boolean;
  spacing?: number;
  children: React.ReactNode;
}

export const Typography: React.FC<TypographyProps> = ({
  variant = "labelBase",
  color,
  align,
  uppercase,
  spacing,
  style,
  children,
  ...rest
}) => {
  const base = TextStyles[variant];

  return (
    <Text
      style={[
        base,
        color ? { color } : undefined,
        align ? { textAlign: align } : undefined,
        uppercase ? { textTransform: "uppercase" } : undefined,
        spacing !== undefined ? { letterSpacing: spacing } : undefined,
        style,
      ]}
      {...rest}
    >
      {children}
    </Text>
  );
};
