import React from 'react';
import { TextInput, View } from 'react-native';

const NativeDatePicker = ({ value, onChange }: any) => {
  // Simple fallback for Web to avoid breaking or showing nothing.
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
      <input 
        type="date"
        value={value ? value.toISOString().split('T')[0] : ''}
        onChange={(e) => {
          if (e.target.value) {
            onChange(null, new Date(e.target.value));
          } else {
            onChange(null, new Date());
          }
        }}
        style={{ padding: 16, fontSize: 18, borderRadius: 12, border: 'none' }}
      />
    </View>
  );
};

export default NativeDatePicker;
