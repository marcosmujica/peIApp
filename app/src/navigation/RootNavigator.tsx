import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuthStore } from "@/store/auth.store";
import { MainTabNavigator } from "./MainTabNavigator";
import { AddMovementScreen } from "@/screens/movements/AddMovementScreen";
import { MovementSuccessScreen } from "@/screens/movements/MovementSuccessScreen";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import { ChatScreen } from "@/screens/chat/ChatScreen";
import { SettingsScreen } from "@/screens/main/SettingsScreen";
import { WalletSettingsScreen } from "@/screens/wallets/WalletSettingsScreen";
import { ContactDetailScreen } from "@/screens/main/ContactDetailScreen";
import { ContactsScreen } from "@/screens/main/ContactsScreen";
import { AIQuestionsScreen } from "@/screens/wallets/AIQuestionsScreen";
import { WalletCategoriesScreen } from "@/screens/wallets/WalletCategoriesScreen";
import { QuickEntryScreen } from "@/screens/movements/QuickEntryScreen";
import { TransferScreen } from "@/screens/wallets/TransferScreen";
import { NewDashboardScreen } from "@/screens/main/NewDashboardScreen";
import { SplitWalletScreen } from "@/screens/wallets/SplitWalletScreen";
import { RecurringTicketsScreen } from "@/screens/movements/RecurringTicketsScreen";
import { EditRecurringTicketScreen } from "@/screens/movements/EditRecurringTicketScreen";
import { VideosScreen } from "@/screens/main/VideosScreen";
import { TermsAndConditionsScreen } from "@/screens/legal/TermsAndConditionsScreen";
import { PaymentRecordsScreen } from "@/screens/main/PaymentRecordsScreen";

export type RootStackParamList = {
  MainTabs: undefined;
  Settings: undefined;
  TermsAndConditions: undefined;
  WalletSettings: { walletId: string };
  AddMovementModal: { walletId?: string; ticketId?: string };
  MovementSuccess: {
    type: 'income' | 'expense';
    amount: string;
    description: string;
    walletName: string;
    date: string;
    status: 'pending' | 'completed';
    currency: string;
    shortId?: string;
  };
  ChatDetail: {
    ticketId: string;
  };
  ContactDetail: {
    avatarUrl?: string;
  };
  Contactos: undefined;
  AIQuestions: { walletId: string };
  WalletCategories: { walletId: string };
  QuickEntry: undefined;
  Transfer: { fromWalletId: string };
  Dashboard: undefined;
  SplitWallet: { walletId: string };
  RecurringTickets: undefined;
  EditRecurringTicket: { item: any };
  Videos: undefined;
  PaymentRecords: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC<{ initialRoute?: keyof RootStackParamList }> = ({ initialRoute }) => {
  const clearJustFinishedOnboarding = useAuthStore(s => s.clearJustFinishedOnboarding);

  React.useEffect(() => {
    if (initialRoute) {
      // Small timeout to ensure everything is mounted
      setTimeout(() => {
        clearJustFinishedOnboarding();
      }, 500);
    }
  }, [initialRoute]);

  return (
    <>
      <Stack.Navigator 
        initialRouteName={initialRoute || "MainTabs"}
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="MainTabs" component={MainTabNavigator} />
      <Stack.Screen 
        name="AddMovementModal" 
        component={AddMovementScreen} 
        options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen 
        name="QuickEntry" 
        component={QuickEntryScreen} 
        options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen 
        name="MovementSuccess" 
        component={MovementSuccessScreen} 
        options={{ presentation: 'fullScreenModal', animation: 'fade' }}
      />
      <Stack.Screen 
        name="ChatDetail" 
        component={ChatScreen} 
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen 
        name="Settings" 
        component={SettingsScreen} 
        options={{ animation: 'slide_from_right', gestureEnabled: true }}
      />
      <Stack.Screen 
        name="WalletSettings" 
        component={WalletSettingsScreen} 
        options={{ animation: 'slide_from_right', gestureEnabled: true }}
      />
      <Stack.Screen 
        name="ContactDetail" 
        component={ContactDetailScreen} 
        options={{ animation: 'slide_from_right', gestureEnabled: true }}
      />
      <Stack.Screen 
        name="Contactos" 
        component={ContactsScreen} 
        options={{ animation: 'slide_from_right', gestureEnabled: true }}
      />
      <Stack.Screen 
        name="AIQuestions" 
        component={AIQuestionsScreen} 
        options={{ animation: 'slide_from_right', gestureEnabled: true }}
      />
      <Stack.Screen 
        name="WalletCategories" 
        component={WalletCategoriesScreen} 
        options={{ animation: 'slide_from_right', gestureEnabled: true }}
      />
      <Stack.Screen 
        name="Transfer" 
        component={TransferScreen} 
        options={{ animation: 'slide_from_right', gestureEnabled: true }}
      />
      <Stack.Screen 
        name="Dashboard" 
        component={NewDashboardScreen} 
        options={{ animation: 'slide_from_right', gestureEnabled: true }}
      />
      <Stack.Screen 
        name="SplitWallet" 
        component={SplitWalletScreen} 
        options={{ animation: 'slide_from_right', gestureEnabled: true }}
      />
      <Stack.Screen 
        name="RecurringTickets" 
        component={RecurringTicketsScreen} 
        options={{ animation: 'slide_from_right', gestureEnabled: true }}
      />
      <Stack.Screen 
        name="EditRecurringTicket" 
        component={EditRecurringTicketScreen} 
        options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen 
        name="Videos" 
        component={VideosScreen} 
        options={{ animation: 'slide_from_right', gestureEnabled: true }}
      />
        <Stack.Screen 
          name="TermsAndConditions" 
          component={TermsAndConditionsScreen} 
          options={{ animation: 'slide_from_right', gestureEnabled: true }}
        />
        <Stack.Screen 
          name="PaymentRecords" 
          component={PaymentRecordsScreen} 
          options={{ animation: 'slide_from_right', gestureEnabled: true }}
        />
      </Stack.Navigator>
    <LoadingOverlay />
    </>
  );
};
