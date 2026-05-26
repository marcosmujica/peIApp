import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Modal, Text } from 'react-native';
import { useUIStore } from '@/store/ui.store';
import { Colors, FontFamily } from '@/constants/theme';

export const LoadingOverlay = () => {
  const isGlobalLoading = useUIStore(s => s.isGlobalLoading);
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    let timer: any;
    
    if (isGlobalLoading) {
      // Si la carga demora más de 0.5s, mostrar el overlay
      timer = setTimeout(() => {
        setShouldShow(true);
      }, 500);
    } else {
      // Si termina antes, limpiar el timer y ocultar
      setShouldShow(false);
      if (timer) clearTimeout(timer);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isGlobalLoading]);

  if (!shouldShow) return null;

  return (
    <Modal
      transparent
      animationType="fade"
      visible={shouldShow}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.blurSim} />
        <View style={styles.container}>
          <ActivityIndicator size="large" color="#171717" />
          <Text style={styles.text}>Trabajando...</Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blurSim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.7)', // Simulación de blur claro
  },
  container: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  text: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: FontFamily.bold,
    color: '#171717',
    textTransform: 'uppercase',
    letterSpacing: 1,
  }
});
