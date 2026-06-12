import axios from 'axios';
import { Platform } from 'react-native';

// Get API_URL directly from process.env or fallback to environment defaults
const rawApiUrl = process.env.EXPO_PUBLIC_API_URL || (Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000');
const API_URL = Platform.OS === 'android' ? rawApiUrl.replace('localhost', '10.0.2.2') : rawApiUrl;

let isLoggingToServer = false;

export function initRemoteLogging() {
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;

  const handleLog = (level: 'log' | 'warn' | 'error', args: any[], originalFn: (...args: any[]) => void) => {
    // Call the original browser/metro console function first
    originalFn(...args);

    if (isLoggingToServer) return;

    try {
      const message = args
        .map(arg => {
          if (arg instanceof Error) {
            return `${arg.message}\n${arg.stack}`;
          }
          if (typeof arg === 'object') {
            try {
              return JSON.stringify(arg);
            } catch (_) {
              return String(arg);
            }
          }
          return String(arg);
        })
        .join(' ');

      // Only forward logs that match our specific debug/system prefixes or are significant
      const matchesPrefix = 
        message.startsWith('[PUSH LOG]') || 
        message.startsWith('[OtpVerify LOG]') || 
        message.startsWith('[Dashboard LOG]') ||
        message.includes('[AI-Pred]') ||
        message.startsWith('--- ENV CONFIG ---') ||
        message.includes('API_URL:') ||
        message.includes('WS_URL:');

      if (!matchesPrefix) return;

      isLoggingToServer = true;

      // Extract a descriptive context from the log message if it has a prefix
      let context = 'ClientApp';
      if (message.startsWith('[PUSH LOG]')) context = 'PushService';
      else if (message.startsWith('[OtpVerify LOG]')) context = 'OtpVerify';
      else if (message.startsWith('[Dashboard LOG]')) context = 'DashboardScreen';
      else if (message.includes('[AI-Pred]')) context = 'AIPrediction';
      else if (message.startsWith('--- ENV CONFIG ---') || message.includes('API_URL:') || message.includes('WS_URL:')) {
        context = 'ClientEnv';
      }

      // Make a clean, simple axios call to avoid interceptor side-effects
      axios.post(`${API_URL}/users/client-log`, {
        message,
        level,
        context,
        platform: Platform.OS
      }, {
        timeout: 5000 // Short timeout to avoid blocking anything
      })
      .then(() => {
        isLoggingToServer = false;
      })
      .catch((err) => {
        isLoggingToServer = false;
        // Output failure message using original console log to avoid recursion
        originalLog('[RemoteLogger] Failed to forward log to server:', err.message);
      });
    } catch (e: any) {
      isLoggingToServer = false;
      originalLog('[RemoteLogger] Critical failure in remote logger hook:', e.message);
    }
  };

  console.log = (...args) => handleLog('log', args, originalLog);
  console.warn = (...args) => handleLog('warn', args, originalWarn);
  console.error = (...args) => handleLog('error', args, originalError);
}
