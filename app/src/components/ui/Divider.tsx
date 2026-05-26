import React from "react";
import { View, ViewStyle } from "react-native";
import { Colors, Spacing } from "@/constants/theme";

/**
 * Divider — thin 1px line using Stroke/Subtle color from Figma.
 */

interface DividerProps {
  color?: string;
  /** Vertical spacing around the divider */
  spacing?: number;
  style?: ViewStyle;
}

export const Divider: React.FC<DividerProps> = ({
  color = Colors.strokeSubtle,
  spacing = 0,
  style,
}) => {
  return (
    <View
      style={[
        {
          height: 1,
          backgroundColor: color,
          width: "100%",
          marginVertical: spacing,
        },
        style,
      ]}
    />
  );
};
