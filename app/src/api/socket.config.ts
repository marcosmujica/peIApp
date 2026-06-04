import { io, Socket } from 'socket.io-client';
import { Platform } from 'react-native';

// Cambia esto a la IP real del servidor si estás probando en un dispositivo físico
const rawServerUrl = process.env.EXPO_PUBLIC_WSS_URL || process.env.EXPO_PUBLIC_WS_URL || (Platform.OS === 'android' ? 'http://10.0.2.2:3001' : 'https://wss.peiapp.tech');
const SERVER_URL = Platform.OS === 'android' ? rawServerUrl.replace('localhost', '10.0.2.2') : rawServerUrl;

export class SocketService {
  private static instance: Socket | null = null;

  public static getInstance(): Socket {
    if (!this.instance) {
      // Intentar forzar polling primero si hay problemas con WS directos
      this.instance = io(SERVER_URL, {
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });
      this.instance.on('connect', () => {
        console.log('Connected to socket server');
      });

      this.instance.on('disconnect', () => {
        console.log('Disconnected from socket server');
      });
    }
    return this.instance;
  }
}
