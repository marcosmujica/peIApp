import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { UnifiedAddWalletScreen } from '@/screens/wallets/UnifiedAddWalletScreen';

export type AddWalletStackParamList = {
  UnifiedAddWallet: undefined;
};

const Stack = createNativeStackNavigator<AddWalletStackParamList>();

export const AddWalletNavigator: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="UnifiedAddWallet" component={UnifiedAddWalletScreen} />
    </Stack.Navigator>
  );
};
