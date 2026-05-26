import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Colors, FontFamily, Spacing } from "@/constants/theme";

// Este será el modal central del + en Fase 5
export const AddMovementModal: React.FC = () => (
  <View style={styles.container}>
    <Text style={styles.text}>¿Qué quieres registrar?</Text>
    <Text style={styles.sub}>Modal de movimiento — Fase 5</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
  },
  text: {
    fontFamily: FontFamily.semibold,
    fontSize: 20,
    color: Colors.foreground, 
  },
  sub: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.mutedForeground,
    marginTop: 8,
  },
});
