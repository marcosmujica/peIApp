import { View, StyleSheet, ViewStyle, StyleProp } from "react-native";
import { Colors, BorderRadius, Shadows, Spacing } from "@/constants/theme";

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padding?: number;
  shadow?: boolean;
  /** Use white or subtle background */
  variant?: "surface" | "subtle";
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  padding = Spacing.lg,
  shadow = false,
  variant = "subtle",
}) => {
  return (
    <View
      style={[
        styles.card,
        variant === "surface" && styles.surface,
        shadow && Shadows.card,
        { padding },
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.subtleSurface,
    borderRadius: BorderRadius.card,
  },
  surface: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.strokeSubtle,
  },
});
