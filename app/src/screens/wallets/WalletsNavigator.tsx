import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { WalletsScreen } from "./WalletsScreen";
import { GenerateQRScreen } from "./GenerateQRScreen";
import { DisplayQRScreen } from "./DisplayQRScreen";
import { WalletDetailsScreen } from "./WalletDetailsScreen";

export type WalletsStackParamList = {
  WalletsMain: undefined;
  GenerateQR: { walletId: string; currency: string };
  DisplayQR: { qrValue: string; title?: string };
  WalletDetails: { walletId: string; walletName: string; walletType?: string; currency?: string; showToast?: boolean; toastMessage?: string };
};

const Stack = createNativeStackNavigator<WalletsStackParamList>();

export const WalletsNavigator: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="WalletsMain" component={WalletsScreen} />
      <Stack.Screen name="GenerateQR" component={GenerateQRScreen} />
      <Stack.Screen name="DisplayQR" component={DisplayQRScreen} />
      <Stack.Screen 
        name="WalletDetails" 
        component={WalletDetailsScreen} 
        options={{ animation: 'slide_from_right', gestureEnabled: true }}
      />
    </Stack.Navigator>
  );
};
