import React, { useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { useAuthStore } from "@/store/auth.store";
import { AuthNavigator } from "./AuthNavigator";
import { RootNavigator } from "./RootNavigator";
import { OnboardingNavigator } from "./OnboardingNavigator";
import { View, ActivityIndicator } from "react-native";
import { Colors } from "@/constants/theme";
import { navigationRef } from "./navigationRef";

export const AppNavigator: React.FC = () => {
  const { token, user, isLoading, hydrate, justFinishedOnboarding, clearJustFinishedOnboarding } = useAuthStore();

  useEffect(() => {
    hydrate();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      {!token ? (
        <AuthNavigator />
      ) : user?.needsOnboarding ? (
        <OnboardingNavigator />
      ) : (
        <RootNavigator initialRoute={justFinishedOnboarding ? 'MainTabs' : undefined} />
      )}
    </NavigationContainer>
  );
};
