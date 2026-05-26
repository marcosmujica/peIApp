import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.peiapp.tech';

export async function registerForPushNotificationsAsync() {
  // Detectar si estamos en Expo Go (SDK 53+ no permite notificaciones en Expo Go)
  const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
  
  if (isExpoGo) {
    console.log('Push notifications are not supported in Expo Go (SDK 53+). Please use a development build/APK.');
    return null;
  }

  let token;

  if (Platform.OS === 'web') {
    return null;
  }

  if (Device.isDevice) {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return null;
      }
      
      const projectId = 'e68496e5-32ba-4b72-96f7-63cbd0010ed6';
      token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      console.log('Expo Push Token:', token);
    } catch (e) {
      console.warn('Notifications not supported in this environment (likely Expo Go SDK 53+). Use a development build/APK for push notifications.', e);
      return null;
    }
  } else {
    console.log('Must use physical device for Push Notifications');
    return null;
  }

  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    } catch (e) {
      // Ignorar error en canales si no es compatible
    }
  }

  return token;
}

export async function saveNotificationId(userId: string, notificationId: string, token: string) {
    try {
        await axios.patch(`${API_URL}/users/${userId}`, {
            notificationId
        }, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        console.log('Notification ID saved to server');
    } catch (e) {
        console.error('Error saving notification ID to server', e);
    }
}
