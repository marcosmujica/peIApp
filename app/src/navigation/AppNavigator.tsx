import React, { useEffect, useRef } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { useAuthStore } from "@/store/auth.store";
import { AuthNavigator } from "./AuthNavigator";
import { RootNavigator } from "./RootNavigator";
import { OnboardingNavigator } from "./OnboardingNavigator";
import { View, ActivityIndicator } from "react-native";
import { Colors } from "@/constants/theme";
import { navigationRef } from "./navigationRef";
import { PostHogProvider, usePostHog } from 'posthog-react-native';

const MainNavigator: React.FC = () => {
  const { token, user, isLoading, hydrate, justFinishedOnboarding } = useAuthStore();
  const posthog = usePostHog();
  const routeNameRef = useRef<string | undefined>();

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
    <NavigationContainer 
      ref={navigationRef}
      onReady={() => {
        const currentRouteName = navigationRef.current?.getCurrentRoute()?.name;
        routeNameRef.current = currentRouteName;
        if (currentRouteName && posthog) {
          posthog.screen(currentRouteName);
        }
      }}
      onStateChange={() => {
        const previousRouteName = routeNameRef.current;
        const currentRouteName = navigationRef.current?.getCurrentRoute()?.name;

        if (currentRouteName && previousRouteName !== currentRouteName) {
          if (posthog) {
            posthog.screen(currentRouteName);
          }
        }
        routeNameRef.current = currentRouteName;
      }}
    >
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

export const AppNavigator: React.FC = () => {
  return (
    <PostHogProvider 
      apiKey={process.env.EXPO_PUBLIC_POSTHOG_API_KEY || 'YOUR_POSTHOG_API_KEY'} 
      options={{
        host: process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
      }}
      autocapture={{
        captureTouches: true,
        captureLifecycleEvents: true,
      }}
    >
      <MainNavigator />
    </PostHogProvider>
  );
};
