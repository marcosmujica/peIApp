import React from "react";
import { View, Image, Text, StyleSheet, ViewStyle } from "react-native";
import { Colors, FontFamily, BorderRadius } from "@/constants/theme";
import { normalizeUrl } from "@/utils/url.util";

/**
 * Avatar component matching Figma's "refe" icon containers.
 *
 * Sizes:
 *   sm  = 24px   (inline lists)
 *   md  = 33px   (wallet cards, transaction items)
 *   lg  = 40px   (profile headers)
 *   xl  = 56px   (large profile)
 */

type AvatarSize = "sm" | "md" | "lg" | "xl";

interface AvatarProps {
  /** Remote image URL */
  uri?: string | null;
  /** Fallback initials (e.g. "MA") */
  initials?: string;
  /** Emoji or icon node to render as fallback */
  icon?: React.ReactNode;
  /** Background color when no image */
  backgroundColor?: string;
  size?: AvatarSize;
  style?: ViewStyle;
}

const sizeMap: Record<AvatarSize, number> = {
  sm: 24,
  md: 33,
  lg: 40,
  xl: 56,
};

const fontSizeMap: Record<AvatarSize, number> = {
  sm: 10,
  md: 12,
  lg: 15,
  xl: 20,
};

export const Avatar: React.FC<AvatarProps> = ({
  uri,
  initials,
  icon,
  backgroundColor = Colors.surface,
  size = "md",
  style,
}) => {
  const dimension = sizeMap[size];
  const borderRadius = dimension * 0.25; // ~8.25 for md matches Figma

  const finalUri = normalizeUrl(uri);

  return (
    <View
      style={[
        styles.container,
        {
          width: dimension,
          height: dimension,
          borderRadius,
          backgroundColor,
        },
        style,
      ]}
    >
      {finalUri ? (
        <Image
          source={{ uri: finalUri }}
          style={[
            styles.image,
            { width: dimension, height: dimension, borderRadius },
          ]}
        />
      ) : icon ? (
        <View style={styles.iconWrapper}>{icon}</View>
      ) : (
        <Text
          style={[
            styles.initials,
            { fontSize: fontSizeMap[size] },
          ]}
        >
          {initials ?? "?"}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  image: {
    resizeMode: "cover",
  },
  iconWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  initials: {
    fontFamily: FontFamily.semibold,
    color: Colors.textSecondary,
    textAlign: "center",
  },
});
