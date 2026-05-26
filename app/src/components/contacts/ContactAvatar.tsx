import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { normalizeUrl } from '@/utils/url.util';

interface ContactAvatarProps {
  name: string;
  imageUri?: string;
  initials: string;
  size?: number;
  onRemove?: () => void;
  showRemove?: boolean;
}

export const ContactAvatar: React.FC<ContactAvatarProps> = ({ 
  name, 
  imageUri, 
  initials, 
  size = 48,
  onRemove,
  showRemove = false
}) => {
  const borderSize = size / 12;
  const radius = size / 2;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {imageUri ? (
        <Image 
          source={{ uri: normalizeUrl(imageUri) }} 
          style={[styles.avatar, { borderRadius: radius }]} 
        />
      ) : initials ? (
        <View style={[styles.fallback, { borderRadius: radius }]}>
          <Text style={[styles.initials, { fontSize: size * 0.4 }]}>{initials}</Text>
        </View>
      ) : (
        <View style={[styles.fallback, { borderRadius: radius }]}>
          <Ionicons name="person" size={size * 0.5} color="#737373" />
        </View>
      )}
      
      {showRemove && onRemove && (
        <TouchableOpacity 
          style={styles.removeBtn} 
          onPress={onRemove}
          activeOpacity={0.8}
        >
          <Ionicons name="close-circle" size={size * 0.4} color="#171717" />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  avatar: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F5F5F5',
  },
  fallback: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E5E5E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontFamily: 'PlusJakarta-SemiBold',
    color: '#171717',
  },
  removeBtn: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: 'white',
    borderRadius: 99,
  },
});
