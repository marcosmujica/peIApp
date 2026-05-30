import 'dotenv/config';
import path from 'path';
import fs from 'fs';

// 1. Detectar si estamos compilando para producción o desarrollo local
const APP_ENV = process.env.APP_ENV || 'development';

// 2. Ruta al archivo de entorno correcto (.env.development o .env.production)
const envPath = path.resolve(__dirname, `.env.${APP_ENV}`);

if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
  console.log(`[ENV] Cargando configuración desde: .env.${APP_ENV}`);
} else {
  console.warn(`[WARNING] No se encontró el archivo de entorno en: ${envPath}`);
}

export default {
  expo: {
    name: "PeiApp",
    slug: "peiapp",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#F7F6F3"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true
    },
    android: {
      package: "com.marcosmujica.peiapp",
      adaptiveIcon: {
        foregroundImage: "./assets/android-icon-foreground.png",
        backgroundColor: "#ffffff"
      }
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    plugins: [
      "expo-font",
      "expo-image",
      "expo-secure-store",
      "expo-sharing",
      "expo-sqlite"
    ],
    // 3. Pasar las variables cargadas para que la App las use en el código
    extra: {
      apiUrl: process.env.EXPO_PUBLIC_API_URL,
      wssUrl: process.env.EXPO_PUBLIC_WSS_URL,
      eas: {
        projectId: "e68496e5-32ba-4b72-96f7-63cbd0010ed6"
      }
    }
  }
};