import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.peiapp.tech';

export async function registerForPushNotificationsAsync() {
  console.log('[PUSH LOG] Starting registerForPushNotificationsAsync...');
  
  // Detectar si estamos en Expo Go (SDK 53+ no permite notificaciones en Expo Go)
  const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
  console.log('[PUSH LOG] isExpoGo:', isExpoGo);
  
  if (isExpoGo) {
    console.log('[PUSH LOG] Push notifications are not supported in Expo Go. Return null.');
    return null;
  }

  let token;

  if (Platform.OS === 'web') {
    console.log('[PUSH LOG] Platform is web. Return null.');
    return null;
  }

  console.log('[PUSH LOG] Device.isDevice:', Device.isDevice);
  if (Device.isDevice) {
    try {
      console.log('[PUSH LOG] Getting current notification permissions...');
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      console.log('[PUSH LOG] Existing status:', existingStatus);
      
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        console.log('[PUSH LOG] Requesting notification permissions...');
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      console.log('[PUSH LOG] Final status:', finalStatus);
      
      if (finalStatus !== 'granted') {
        console.log('[PUSH LOG] Permission not granted. Return null.');
        return null;
      }
      
      const projectId = 'e68496e5-32ba-4b72-96f7-63cbd0010ed6';
      console.log('[PUSH LOG] Fetching Expo push token using projectId:', projectId);
      
      const tokenObj = await Notifications.getExpoPushTokenAsync({ projectId });
      token = tokenObj.data;
      console.log('[PUSH LOG] Expo Push Token fetched successfully:', token);
    } catch (e: any) {
      console.warn('[PUSH LOG] Error fetching Expo push token:', e.message || e);
      return null;
    }
  } else {
    console.log('[PUSH LOG] Not a physical device. Return null.');
    return null;
  }

  if (Platform.OS === 'android') {
    try {
      console.log('[PUSH LOG] Setting default Android notification channel...');
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
      console.log('[PUSH LOG] Android channel configured.');
    } catch (e: any) {
      console.log('[PUSH LOG] Error configuring Android channel:', e.message || e);
    }
  }

  return token;
}

export async function saveNotificationId(userId: string, notificationId: string, token: string) {
    const url = `${API_URL}/users/${userId}`;
    console.log(`[PUSH LOG] Attempting to save token to: PATCH ${url}`);
    console.log(`[PUSH LOG] Body:`, JSON.stringify({ notificationId }));
    console.log(`[PUSH LOG] Token: Bearer ${token ? token.slice(0, 15) + '...' : 'null'}`);
    
    try {
        const response = await axios.patch(url, {
            notificationId
        }, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        console.log('[PUSH LOG] Server Response Status:', response.status);
        console.log('[PUSH LOG] Server Response Data:', JSON.stringify(response.data));
        console.log('[PUSH LOG] Notification ID saved to server successfully');
    } catch (e: any) {
        if (e.response) {
            console.error('[PUSH LOG] Server responded with error:', e.response.status, JSON.stringify(e.response.data));
        } else {
            console.error('[PUSH LOG] Network/Request error details:', e.message || e);
        }
    }
}
