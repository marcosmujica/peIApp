import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { BusinessTypeScreen } from "@/screens/onboarding/BusinessTypeScreen";
import { WalletsSummaryScreen } from "@/screens/onboarding/WalletsSummaryScreen";

export type OnboardingParamList = {
  BusinessType: undefined;
  WalletsSummary: { businessType: string | null };
};

const Stack = createNativeStackNavigator<OnboardingParamList>();

export const OnboardingNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="BusinessType"
      screenOptions={{ headerShown: false, animation: "slide_from_right" }}
    >
      <Stack.Screen name="BusinessType" component={BusinessTypeScreen} />
      <Stack.Screen name="WalletsSummary" component={WalletsSummaryScreen} />
    </Stack.Navigator>
  );
};
