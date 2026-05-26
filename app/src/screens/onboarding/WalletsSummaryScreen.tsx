import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Animated } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { OnboardingParamList } from "@/navigation/OnboardingNavigator";
import { Button } from "@/components/ui/Button";
import { Colors } from "@/constants/theme";
import { useAuthStore } from "@/store/auth.store";
import { Ionicons } from "@expo/vector-icons";

type Props = NativeStackScreenProps<OnboardingParamList, "WalletsSummary">;

export const WalletsSummaryScreen: React.FC<Props> = ({ route, navigation }) => {
  const { businessType } = route.params;
  const completeOnboarding = useAuthStore((s) => s.completeOnboarding);
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  const getWalletsToDisplay = () => {
    const list = [
      {
        icon: "cash-outline",
        name: "Cobros sin billetera",
        desc: "Tu saldo centralizado para visualizar el total de tus ingresos desde un único panel.",
      },
      {
        icon: "file-tray-outline",
        name: "Pagos sin Billetera",
        desc: "Un resguardo del sistema para aquellos tickets que aún no asocies a tu negocio.",
      },
    ];

    if (businessType === "none") {
      list.push({
        icon: "person-outline",
        name: "Mi Billetera",
        desc: "Mi billetera personal para rastrear ingresos y gastos del día a día.",
      });
    }

    if (businessType === "products" || businessType === "both") {
      list.push({
        icon: "cube-outline",
        name: "Mi negocio de productos",
        desc: "Lista para manejar tus ventas, control y tickets relacionados a productos físicos.",
      });
    }

    if (businessType === "services" || businessType === "both") {
      list.push({
        icon: "briefcase-outline",
        name: "Mi negocio de servicios",
        desc: "El espacio ideal para registrar y administrar los honorarios de todos tus servicios prestados.",
      });
    }

    return list;
  };

  const wallets = getWalletsToDisplay();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
      <View className="flex-1 px-6 pt-6 pb-10 justify-between">
      <View style={{ flex: 1 }}>
        <Text className="text-3xl font-bold text-neutral-900 mb-2">
          Todo listo
        </Text>
        <Text className="text-base text-neutral-500 mb-8">
          Basado en el perfil que nos comentaste, hemos creado un entorno de billeteras a tu medida:
        </Text>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
          <Animated.View style={{ opacity: fadeAnim, gap: 16 }}>
            {wallets.map((w, index) => (
              <View 
                key={index} 
                style={{ 
                  flexDirection: "row", 
                  backgroundColor: "#F9FAFB", 
                  padding: 16, 
                  borderRadius: 16, 
                  borderWidth: 1, 
                  borderColor: "#F3F4F6",
                  alignItems: "center"
                }}
              >
                <View 
                  style={{ 
                    width: 48, 
                    height: 48, 
                    borderRadius: 24, 
                    backgroundColor: Colors.surfaceAlt, 
                    alignItems: "center", 
                    justifyContent: "center",
                    marginRight: 16
                  }}
                >
                  <Ionicons name={w.icon as any} size={24} color={Colors.textPrimary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text className="text-lg font-bold text-neutral-900 mb-1">{w.name}</Text>
                  <Text className="text-sm text-neutral-500 leading-5">{w.desc}</Text>
                </View>
              </View>
            ))}
          </Animated.View>
        </ScrollView>
      </View>

      <Button
        label="Comenzar a usar peIApp"
        onPress={() => completeOnboarding()}
      />
      </View>
    </SafeAreaView>
  );
};
