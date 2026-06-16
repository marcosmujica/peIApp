import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { Colors, FontFamily, Spacing } from "@/constants/theme";
import { Ionicons } from '@expo/vector-icons';

import { HomeNavigator } from "./HomeNavigator";
import { WalletsNavigator } from "@/screens/wallets/WalletsNavigator";
import { HistoryScreen } from "@/screens/history/HistoryScreen";
import { ContactsScreen } from "@/screens/main/ContactsScreen";
import { CalendarScreen } from "@/screens/calendar/CalendarScreen";
import { MoreMenuScreen } from "@/screens/main/MoreMenuScreen";
import { getLocalWallets } from "@/storage/wallets.local";

// Placeholder screens
const ProfileScreen = () => <View><Text>Perfil</Text></View>;
const AddMovementModal = () => <View><Text>Add</Text></View>;

export type MainTabParamList = {
  Inicio: undefined;
  Billeteras: { screen?: string; params?: any } | undefined;
  Historial: undefined;
  Calendario: undefined;
  Menu: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

const IconHome = ({ focused }: { focused: boolean }) => (
  <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={focused ? '#196342' : '#9f9f93'} />
);
const IconWallet = ({ focused }: { focused: boolean }) => (
  <Ionicons name={focused ? 'wallet' : 'wallet-outline'} size={22} color={focused ? '#196342' : '#9f9f93'} />
);
const IconHistory = ({ focused }: { focused: boolean }) => (
  <Ionicons name={focused ? 'time' : 'time-outline'} size={22} color={focused ? '#196342' : '#9f9f93'} />
);
const IconContacts = ({ focused }: { focused: boolean }) => (
  <Ionicons name={focused ? 'person' : 'person-outline'} size={22} color={focused ? '#196342' : '#9f9f93'} />
);
const IconCalendar = ({ focused }: { focused: boolean }) => (
  <Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={22} color={focused ? '#196342' : '#9f9f93'} />
);
const IconMenu = ({ focused }: { focused: boolean }) => (
  <Ionicons name={focused ? 'menu' : 'menu-outline'} size={22} color={focused ? '#196342' : '#9f9f93'} />
);

function CustomTabBar({ state, descriptors, navigation }: any) {
  return (
    <View style={styles.tabBarContainer}>
      <View style={styles.tabBar}>
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          let label = options.tabBarLabel ?? route.name;
          // Apply Figma labels over internal route names
          if (route.name === 'Historial') label = 'Tickets';
          if (route.name === 'Contactos') label = 'Contactos';
          if (route.name === 'Calendario') label = 'Movimientos';
          if (route.name === 'Menu') label = 'Más';

          const isFocused = state.index === index;

          const onPress = async () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });

            if (!event.defaultPrevented) {
              if (route.name === 'Billeteras') {
                navigation.navigate('Billeteras', { screen: 'WalletsMain' });
              } else if (!isFocused) {
                navigation.navigate(route.name);
              }
            }
          };

          let icon;
          switch (route.name) {
            case "Inicio": icon = <IconHome focused={isFocused} />; break;
            case "Billeteras": icon = <IconWallet focused={isFocused} />; break;
            case "Historial": icon = <IconHistory focused={isFocused} />; break;
            case "Contactos": icon = <IconContacts focused={isFocused} />; break;
            case "Calendario": icon = <IconCalendar focused={isFocused} />; break;
            case "Menu": icon = <IconMenu focused={isFocused} />; break;
          }

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={styles.tabItem}
              activeOpacity={0.7}
            >
              {icon}
              <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export const MainTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Inicio" component={HomeNavigator} />
      <Tab.Screen name="Billeteras" component={WalletsNavigator} />
      <Tab.Screen name="Historial" component={HistoryScreen} />
      <Tab.Screen name="Calendario" component={CalendarScreen} />
      <Tab.Screen
        name="Menu"
        component={MoreMenuScreen}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBarContainer: {
    backgroundColor: '#f2f2f0',
    borderTopWidth: 0,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: '#f2f2f0',
    paddingBottom: Platform.OS === "ios" ? 40 : 28,
    paddingTop: 16,
    paddingHorizontal: Spacing.sm,
    alignItems: "center",
    justifyContent: "space-between",
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  tabLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: '#9f9f93',
  },
  tabLabelActive: {
    color: '#196342',
  },
});
