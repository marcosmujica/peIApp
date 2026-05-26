import React, { useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { OnboardingParamList } from "@/navigation/OnboardingNavigator";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Colors } from "@/constants/theme";
import { useAuthStore } from "@/store/auth.store";
import { walletsApi } from "@/api/wallets.api";

type Props = NativeStackScreenProps<OnboardingParamList, "BusinessType">;

export const BusinessTypeScreen: React.FC<Props> = ({ navigation }) => {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSettingUp, setIsSettingUp] = useState(false);

  const updateUser = useAuthStore((s) => s.updateUser);
  const completeOnboarding = useAuthStore((s) => s.completeOnboarding);

  const OPTIONS = [
    { id: "none", label: "No tengo negocio" },
    { id: "products", label: "Vendo productos" },
    { id: "services", label: "Brindo servicios" },
    { id: "both", label: "Vendo productos y servicios" },
  ];

  const handleFinish = async () => {
    setIsLoading(true);
    try {
      const { defaultWalletId } = await walletsApi.setupOnboarding({ businessType: selectedType, splitPercentage: 50 });
      if (defaultWalletId) {
        updateUser({ defaultWalletId });
      }
      setIsLoading(false);
      setIsSettingUp(true);

      // Instead of completing onboarding, simply navigate to the new Summary screen
      setTimeout(() => {
          navigation.navigate("WalletsSummary", { businessType: selectedType });
      }, 2500);

    } catch (e) {
      console.error("Error setting up first wallet", e);
      setIsLoading(false);
      completeOnboarding();
    }
  };

  if (isSettingUp) {
    return (
      <View className="flex-1 bg-white items-center justify-center px-10">
        <ActivityIndicator size="large" color={Colors.primary} className="mb-6" />
        <Text className="text-xl font-bold text-neutral-900 text-center mb-2">
          ¡Casi listo!
        </Text>
        <Text className="text-base text-neutral-500 text-center">
          Estamos configurando tus billeteras para darte la mejor experiencia, por favor aguarda...
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
      <View className="flex-1 px-6 pt-6 pb-10 justify-between">
      <View>
        <Text className="text-3xl font-bold text-neutral-900 mb-8">
          ¿Qué tipo de negocio tienes?
        </Text>

        <View className="flex-col space-y-4 gap-4">
          {OPTIONS.map((option) => {
            const isSelected = selectedType === option.id;
            return (
              <TouchableOpacity
                key={option.id}
                activeOpacity={0.7}
                onPress={() => setSelectedType(option.id)}
              >
                <Card
                  style={{
                    backgroundColor: isSelected ? Colors.primary : Colors.background,
                    borderColor: isSelected ? Colors.primary : Colors.border,
                  }}
                >
                  <Text
                    className={`text-lg font-medium ${
                      isSelected ? "text-white" : "text-neutral-900"
                    }`}
                  >
                    {option.label}
                  </Text>
                </Card>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <Button
        label="Finalizar y entrar a peIApp"
        onPress={handleFinish}
        disabled={!selectedType || isLoading}
        loading={isLoading}
      />
      </View>
    </SafeAreaView>
  );
};
