import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SplashScreen } from "@/screens/auth/SplashScreen";
import { PhoneInputScreen } from "@/screens/auth/PhoneInputScreen";
import { OtpVerifyScreen } from "@/screens/auth/OtpVerifyScreen";
import { WelcomeIntroScreen } from "@/screens/welcome/WelcomeIntroScreen";
import { WelcomeCarouselScreen } from "@/screens/welcome/WelcomeCarouselScreen";
import { TermsAndConditionsScreen } from "@/screens/legal/TermsAndConditionsScreen";

export type AuthStackParamList = {
  Splash: undefined;
  WelcomeIntro: undefined;
  WelcomeCarousel: undefined;
  PhoneInput: undefined;
  OtpVerify: { phoneNumber: string };
  TermsAndConditions: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export const AuthNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{ headerShown: false, animation: "fade" }}
    >
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="WelcomeIntro" component={WelcomeIntroScreen} />
      <Stack.Screen name="WelcomeCarousel" component={WelcomeCarouselScreen} />
      <Stack.Screen name="PhoneInput" component={PhoneInputScreen} />
      <Stack.Screen name="OtpVerify" component={OtpVerifyScreen} />
      <Stack.Screen name="TermsAndConditions" component={TermsAndConditionsScreen} />
    </Stack.Navigator>
  );
};
