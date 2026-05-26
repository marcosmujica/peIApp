import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors, FontFamily, Shadows, BorderRadius, Spacing } from '@/constants/theme';
import { Typography, Button } from '@/components/ui';

type AddWalletStackParamList = {
  AddWalletStep1: undefined;
  AddWalletStep2: { walletType: string; defaultPaymentMethod?: string };
  AddWalletStep3: { walletType: string; walletName: string; defaultPaymentMethod?: string };
};

type WalletType = 'personal' | 'negocio_productos' | 'negocio_servicios' | 'compartido' | 'community' | 'otro';

interface WalletOption {
  id: WalletType;
  icon: string;
  label: string;
  description: string;
}

const OPTIONS: WalletOption[] = [
  { id: 'personal', icon: 'home-outline', label: 'Personal', description: 'Ingresos, gastos del hogar y lo del dia a dia.' },
  { id: 'negocio_productos', icon: 'briefcase-outline', label: 'Negocio de productos', description: 'Las ganancias, los costos y lo que te queda.' },
  { id: 'negocio_servicios', icon: 'construct-outline', label: 'Negocio de servicios', description: 'Tus honorarios, horas trabajadas y gastos fijos.' },
  { id: 'compartido', icon: 'people-outline', label: 'Compartido', description: 'Lo que cada uno pone y lo que se debe.' },
  { id: 'community', icon: 'accessibility-outline', label: 'Comunidad', description: 'Para grupos, asociaciones, eventos o causas comunes.' },
  { id: 'otro', icon: 'folder-outline', label: 'Otro', description: 'Algo que no entra en las categorías anteriores.' },
];

type Props = NativeStackScreenProps<AddWalletStackParamList, 'AddWalletStep1'> & {
  onClose?: () => void;
};

export const AddWalletStep1Screen: React.FC<Props> = ({ navigation, onClose }) => {
  const [selected, setSelected] = useState<WalletType | null>(null);

  const handleBack = () => {
    if (onClose) {
      onClose();
    } else {
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.progressWrapper}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '50%', backgroundColor: Colors.primary }]} />
          </View>
          <Typography variant="captionBase" color="tertiary">1 de 2</Typography>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Content */}
      <ScrollView 
        style={{ flex: 1, marginBottom: 60 }} 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Typography variant="headingH1" style={{ marginBottom: Spacing.xs }}>¿Con qué quieres{'\n'}empezar?</Typography>
        <Typography variant="bodyLarge" color="secondary" style={{ marginBottom: Spacing.xxl }}>
          Elegí el tipo de billetera y la app se adapta a tu lenguaje.{'\n'}Podés agregar más después.
        </Typography>

        <View style={styles.options}>
          {OPTIONS.map((opt) => {
            const isSelected = selected === opt.id;
            return (
              <TouchableOpacity
                key={opt.id}
                style={[
                  styles.option, 
                  isSelected && styles.optionSelected,
                  Shadows.card
                ]}
                onPress={() => {
                  setSelected(opt.id);
                  navigation.navigate('AddWalletStep2', { walletType: opt.id });
                }}
                activeOpacity={0.75}
              >
                <View style={styles.optionLeft}>
                  <View style={[styles.optionIcon, isSelected && { backgroundColor: Colors.primaryLight }]}>
                    <Ionicons name={opt.icon as any} size={22} color={isSelected ? Colors.primary : Colors.textSecondary} />
                  </View>
                  <View style={styles.optionText}>
                    <Typography 
                      variant="labelBase" 
                      color={isSelected ? 'primary' : 'secondary'}
                    >
                      {opt.label}
                    </Typography>
                    <Typography variant="captionBase" color="tertiary">{opt.description}</Typography>
                  </View>
                </View>
                <View style={[styles.radio, isSelected && { backgroundColor: Colors.primary, borderColor: Colors.primary }]}>
                  {isSelected && <Ionicons name="checkmark" size={14} color="white" />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Footer */}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  progressWrapper: { flex: 1, alignItems: 'center', gap: 6 },
  progressBar: {
    height: 4,
    backgroundColor: Colors.strokeSubtle,
    borderRadius: 99,
    width: '60%',
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    borderRadius: 99,
  },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 20 },
  options: { gap: 12 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: BorderRadius.card,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  optionSelected: {
    borderColor: Colors.primary,
  },
  optionLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  optionIcon: {
    width: 44,
    height: 44,
    backgroundColor: Colors.subtleSurface,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  optionText: { flex: 1, gap: 2 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: Colors.inputBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: { paddingHorizontal: 24, paddingBottom: 32, paddingTop: 12 },
});
