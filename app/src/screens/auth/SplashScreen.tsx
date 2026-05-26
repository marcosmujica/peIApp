import React, { useEffect } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AuthStackParamList } from "@/navigation/AuthNavigator";
import { Colors, FontFamily, FontSize } from "@/constants/theme";

import { LogoPei } from "@/components/ui/LogoPei";

type Props = NativeStackScreenProps<AuthStackParamList, "Splash">;

export const SplashScreen: React.FC<Props> = ({ navigation }) => {
  useEffect(() => {
    const bootstrap = async () => {
      // Much faster delay as requested
      await new Promise((r) => setTimeout(r, 500));
      navigation.replace("WelcomeIntro");
    };

    bootstrap();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.logoWrapper}>
        <LogoPei tintColor={Colors.white} size={64} />
      </View>
      <Text style={styles.tagline}>PAZ FINANCIERA</Text>
      <ActivityIndicator
        color="rgba(255,255,255,0.4)"
        style={styles.loader}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  logoWrapper: {
    marginBottom: 16,
    alignItems: 'center',
  },
  tagline: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    color: "rgba(255,255,255,0.4)",
    letterSpacing: 3,
  },
  loader: {
    marginTop: 40,
  },
});
