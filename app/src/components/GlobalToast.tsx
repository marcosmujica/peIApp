import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, Animated, Platform, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUIStore } from '../store/ui.store';
import { FontFamily } from '../constants/theme';

export const GlobalToast: React.FC = () => {
  const { toast, hideToast } = useUIStore();
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (toast.visible) {
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.delay(3000),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start(() => {
        hideToast();
      });
    }
  }, [toast.visible]);

  if (!toast.visible) return null;

  const isWarning = toast.type === 'warning';
  const isError = toast.type === 'error';

  return (
    <Animated.View style={[
      styles.container, 
      { opacity },
      isWarning && styles.warning,
      isError && styles.error
    ]}>
      <View style={styles.content}>
        <Ionicons 
          name={isWarning || isError ? 'alert-circle' : 'checkmark-circle'} 
          size={20} 
          color={isWarning ? '#92400E' : isError ? '#991B1B' : '#FFF'} 
        />
        <Text style={[
          styles.text,
          isWarning && { color: '#92400E' },
          isError && { color: '#991B1B' }
        ]}>
          {toast.message}
        </Text>
        {toast.action && (
          <TouchableOpacity 
            onPress={() => {
              toast.action?.onPress();
              hideToast();
            }}
            style={styles.actionBtn}
          >
            <Text style={styles.actionText}>{toast.action.label}</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    left: 20,
    right: 20,
    backgroundColor: '#171717',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    zIndex: 9999,
    ...Platform.select({
      web: {
        boxShadow: '0 8px 16px rgba(0, 0, 0, 0.4)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 12,
      }
    }),
  },
  warning: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  error: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  text: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: FontFamily.medium,
    lineHeight: 18,
  },
  actionBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: FontFamily.bold,
    textDecorationLine: 'underline',
  },
});
