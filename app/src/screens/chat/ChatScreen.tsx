import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
  Keyboard,
  Modal,
  Pressable,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/RootNavigator';
import { FontFamily } from '@/constants/theme';
import { getLocalTickets, LocalTicket, updateLocalTicket } from '@/storage/tickets.local';
import { getTicketMessages, addTicketMessage, saveTicketMessages, ChatMessage } from '@/storage/chat.local';

import { ticketsApi } from '@/api/tickets.api';
import { updateLocalWalletChat } from '@/storage/wallets.local';
import { useAuthStore } from '@/store/auth.store';

import { SocketService } from '@/api/socket.config';

import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import NativeDatePicker from '@/components/ui/NativeDatePicker';
import { API_URL } from '@/api/api.client';
import { normalizeUrl } from '@/utils/url.util';


type Props = NativeStackScreenProps<RootStackParamList, 'ChatDetail'>;

export const ChatScreen: React.FC<Props> = ({ route, navigation }) => {
  const { ticketId } = route.params;
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const [ticket, setTicket] = useState<LocalTicket | null>(null);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDateOptionsModalVisible, setDateOptionsModalVisible] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const socket = useRef(SocketService.getInstance());
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    // 1. Join Room and handle reconnection
    const joinRoom = () => {
      console.log(`[Chat] Joining ticket room: ${ticketId}`);
      socket.current.emit('joinTicket', ticketId);
    };

    if (socket.current.connected) {
      joinRoom();
    }
    socket.current.on('connect', joinRoom);

    // 2. Listen for New Messages
    const handleNewMessage = async (msg: any) => {
      console.log(`[Chat] Received newMessage event:`, msg);
      
      const isMe = (user?.id && msg.senderId && user.id.toString() === msg.senderId.toString()) || 
                   (user?.phoneNumber && msg.senderId && user.phoneNumber.toString() === msg.senderId.toString());
      
      const mapped: ChatMessage = {
        id: msg.chatId,
        ticketId: msg.ticketId,
        sender: isMe ? 'me' : 'other' as const,
        text: msg.message,
        attachmentUrl: msg.attachmentUrl,
        attachmentType: msg.attachmentType,
        time: new Date(msg.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        createdAt: msg.createdAt || new Date().toISOString(),
      };
      
      setMessages(prev => {
        // Evitar duplicados. Si es mío, ya tengo el optimista (id temp-)
        const exists = prev.find(m => m.id === mapped.id);
        if (exists) return prev;
        
        // Si es de otro, o es real de una optimista
        const filtered = prev.filter(m => {
          const isOptimisticDuplicate = m.id.startsWith('temp-') && m.text === mapped.text && isMe;
          return !isOptimisticDuplicate;
        });
        
        return [...filtered, mapped];
      });
      
      await addTicketMessage(ticketId, mapped);
      
      await updateLocalTicket(ticketId, {
        lastChatMessage: mapped.text || (mapped.attachmentType === 'image' ? '📸 Imagen' : '📄 Archivo'),
        lastChatIsSeen: isMe,
        lastChatSenderId: msg.senderId
      });

      if (ticket?.walletId) {
        await updateLocalWalletChat(ticket.walletId, {
          lastChatMessage: mapped.text || (mapped.attachmentType === 'image' ? '📸 Imagen' : '📄 Archivo'),
          lastChatIsSeen: isMe,
          lastChatSenderId: msg.senderId || 'unknown'
        });
      }

      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    };

    socket.current.on('newMessage', handleNewMessage);

    const loadSession = async () => {
      if (!ticketId) return;
      try {
        const found = (await getLocalTickets()).find(t => t.id === ticketId);
        if (found) setTicket(found);
        
        const savedMessages = await getTicketMessages(ticketId);
        setMessages(savedMessages);

        try {
          const serverMessages = await ticketsApi.getChatMessages(ticketId);
            const mappedMessages: ChatMessage[] = serverMessages.map(m => {
              const isMe = (user?.id && m.senderId && user.id.toString() === m.senderId.toString()) || 
                           (user?.phoneNumber && m.senderId && user.phoneNumber.toString() === m.senderId.toString());
              return {
                id: m.chatId,
                ticketId: m.ticketId,
                sender: isMe ? 'me' : 'other' as const,
                text: m.message,
                attachmentUrl: m.attachmentUrl,
                attachmentType: m.attachmentType,
                time: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                createdAt: m.createdAt,
              };
            });
            setMessages(mappedMessages);
            for (const m of mappedMessages) await addTicketMessage(ticketId, m);
          } catch (apiErr) {
            console.warn("[Chat] Sync failed", apiErr);
          }

        setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 200);
      } catch (err) {
        console.error("[Chat] Fatal loadSession error", err);
      }
    };
    loadSession();

    return () => {
      socket.current.off('connect', joinRoom);
      socket.current.off('newMessage', handleNewMessage);
    };
  }, [ticketId, user?.id]);

  const handleSend = async (text?: string, attachUrl?: string, attachType?: 'image' | 'file') => {
    if (!user) return;
    if (!text?.trim() && !attachUrl) return;
    
    setInputText('');

    // Update Optimista (ID Temporal)
    const tempId = 'temp-' + Date.now();
    const tempMsg: ChatMessage = {
      id: tempId,
      ticketId,
      sender: 'me',
      text: text,
      attachmentUrl: attachUrl, // Local URI for now? 
      attachmentType: attachType,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempMsg]);
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      // 1. Upload if it's a local URI (placeholder: we do it before calling handleSend in practice)
      // 2. Persistencia en BD vía API
      const saved = await ticketsApi.addChatMessage(ticketId, text, user.displayName, attachUrl, attachType);
      
      // 3. Notificar vía Socket
      socket.current.emit('sendMessage', {
        chatId: saved.chatId,
        ticketId,
        senderId: user.id,
        message: text,
        senderName: user.displayName,
        attachmentUrl: attachUrl,
        attachmentType: attachType,
        createdAt: saved.createdAt,
      });

      // 4. Actualizar cache real
      const realMsg: ChatMessage = {
        ...tempMsg,
        id: saved.chatId,
        createdAt: saved.createdAt,
      };
      await addTicketMessage(ticketId, realMsg);
      setMessages(prev => prev.map(m => m.id === tempId ? realMsg : m));
      
      // Actualizar el "último mensaje" en el ticket local para que en la lista se vea como visto por mí
      await updateLocalTicket(ticketId, {
        lastChatMessage: realMsg.text || (realMsg.attachmentType === 'image' ? '📸 Imagen' : '📄 Archivo'),
        lastChatIsSeen: true,
        lastChatSenderId: user.id
      });

      // Actualizar la Billetera también (visto por mí)
      if (ticket?.walletId) {
        await updateLocalWalletChat(ticket.walletId, {
          lastChatMessage: realMsg.text || (realMsg.attachmentType === 'image' ? '📸 Imagen' : '📄 Archivo'),
          lastChatIsSeen: true,
          lastChatSenderId: user.id.toString()
        });
      }

    } catch (err) {
      console.error("[Chat] Error sending message", err);
    }
  };

  const applyDateChange = async (newDate: Date) => {
    try {
      const updated = await ticketsApi.updateTicketDueDate(ticketId, newDate);
      setTicket(prev => prev ? { ...prev, dueDate: updated.dueDate.toString(), initialDueDate: updated.initialDueDate?.toString() } : null);
      await updateLocalTicket(ticketId, { 
        dueDate: updated.dueDate.toString(), 
        initialDueDate: updated.initialDueDate?.toString() 
      });
      
      // Refresh messages from server to show the system message created by server
      try {
        const serverMessages = await ticketsApi.getChatMessages(ticketId);
        const mappedMessages: ChatMessage[] = serverMessages.map(m => {
          const isMe = (user?.id && m.senderId && user.id.toString() === m.senderId.toString()) || 
                       (user?.phoneNumber && m.senderId && user.phoneNumber.toString() === m.senderId.toString());
          return {
            id: m.chatId,
            ticketId: ticketId,
            text: m.message,
            sender: isMe ? 'me' : 'other',
            createdAt: m.createdAt,
            time: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            attachmentUrl: m.attachmentUrl,
            attachmentType: (m.attachmentType === 'image' || m.attachmentType === 'file') ? m.attachmentType : undefined,
          };
        });
        setMessages(mappedMessages);
        // Persistir localmente también
        await saveTicketMessages(ticketId, mappedMessages);
      } catch (err) {
        console.warn("Failed to refresh messages after date change", err);
      }

      // Emit socket event to notify other participant (optional, but good for real time)
      if (user) {
        socket.current.emit('sendMessage', {
          ticketId,
          senderId: user.id || user.phoneNumber,
          message: `** Cambio la fecha de pago para el ${newDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}`,
          senderName: 'Sistema',
        });
      }

    } catch (err) {

      console.error("[Chat] Error updating date", err);
      Alert.alert('Error', 'No se pudo actualizar la fecha de pago');
    }
  };


  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS !== 'ios') setShowDatePicker(false);
    if (selectedDate) {
      applyDateChange(selectedDate);
    }
  };


  const handlePlusPress = () => {
    console.log("[Chat] Opening Custom Plus Menu");
    Keyboard.dismiss();
    setShowPlusMenu(true);
  };

  const pickImage = async (camera: boolean) => {
    try {
      let result;
      if (camera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) return;
        result = await ImagePicker.launchCameraAsync({
          quality: 0.8,
        });
      } else {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) return;
        result = await ImagePicker.launchImageLibraryAsync({
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const localFileName = asset.fileName || `image_${Date.now()}.jpg`;
        const localMimeType = asset.mimeType || 'image/jpeg';

        console.log(`[Chat] Uploading file: ${localFileName}, type: ${localMimeType}`);
        
        // 1. Subir al server
        const uploaded = await ticketsApi.uploadChatFile(
          ticketId, 
          asset.uri, 
          localFileName, 
          localMimeType
        );
        // 2. Enviar mensaje de chat con el URL del server
        await handleSend(undefined, uploaded.url, 'image');
      }
    } catch (err) {
      console.warn("Failed to pick image", err);
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        // 1. Subir al server
        const uploaded = await ticketsApi.uploadChatFile(
          ticketId, 
          asset.uri, 
          asset.name, 
          asset.mimeType || 'application/octet-stream'
        );
        // 2. Enviar mensaje de chat
        await handleSend(`📄 ${asset.name}`, uploaded.url, 'file');
      }
    } catch (err) {
      console.warn("Failed to pick document", err);
    }
  };

  if (!ticket) return null;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#171717" />
          </TouchableOpacity>
          
          <View style={styles.headerAvatarContainer}>
            {(() => {
              const targetAvatar = ticket.role === 'owner_id' ? ticket.toUserAvatarUrl : ticket.ownerAvatarUrl;
              if (targetAvatar) {
                return <Image source={{ uri: normalizeUrl(targetAvatar) }} style={styles.headerAvatar} />;
              }
              return (
                <View style={[styles.headerAvatar, styles.headerAvatarPlaceholder]}>
                  <Ionicons name="person" size={20} color="#9CA3AF" />
                </View>
              );
            })()}
          </View>

          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle} numberOfLines={1}>{ticket.description || 'Ticket'}</Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {(() => {
                const targetName = ticket.role === 'owner_id' ? (ticket.toUserDisplayName || ticket.contactName) : (ticket.ownerDisplayName || 'Propietario');
                return targetName || 'Sin nombre';
              })()} · {ticket.currency} ${ticket.amount.toLocaleString('es-AR')}
            </Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>
        
        {/* Fixed System Alerts (Sticky Header) */}
        <View style={{ backgroundColor: '#FFFFFF', paddingHorizontal: 20, paddingBottom: 16, gap: 8, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' }}>
          {/* Alerta de cambio de monto */}
          {ticket.initialAmount != null && 
           Number(ticket.initialAmount) !== Number(ticket.amount) && (
            <View style={[styles.systemAlert, { marginBottom: 0 }]}>
              <View style={styles.systemAlertIcon}>
                <Ionicons name="information-circle" size={18} color="#0369A1" />
              </View>
              <Text style={styles.systemAlertText}>
                {`El monto inicial de este ticket era ${ticket.currency} $${Number(ticket.initialAmount).toLocaleString('es-AR')}. Se ha actualizado a ${ticket.currency} $${Number(ticket.amount).toLocaleString('es-AR')}.`}
              </Text>
            </View>
          )}

          {ticket.initialDueDate != null && 
           new Date(ticket.initialDueDate).toISOString().split('T')[0] !== new Date(ticket.dueDate).toISOString().split('T')[0] && (
            <View style={[styles.systemAlert, { marginBottom: 0 }]}>
              <View style={styles.systemAlertIcon}>
                <Ionicons name="calendar" size={18} color="#0369A1" />
              </View>
              <Text style={styles.systemAlertText}>
                {(() => {
                  const d1 = new Date(ticket.initialDueDate);
                  const d2 = new Date(ticket.dueDate);
                  d1.setHours(0,0,0,0);
                  d2.setHours(0,0,0,0);
                  const diffTime = Math.abs(d2.getTime() - d1.getTime());
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                  
                  return `La fecha inicial de pago era el ${d1.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}. La nueva fecha es del ${d2.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}. La diferencia es de ${diffDays} días.`;
                })()}
              </Text>
            </View>
          )}
        </View>

        {/* Messages */}
        <ScrollView 
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map((item) => (
            <View 
              key={item.id} 
              style={[
                styles.messageRow, 
                item.sender === 'me' ? styles.messageRowMe : styles.messageRowOther
              ]}
            >
              <View style={[
                styles.bubble, 
                item.sender === 'me' ? styles.bubbleMe : styles.bubbleOther,
                (item.attachmentUrl && item.attachmentType === 'image') && { padding: 4 }
              ]}>
                {/* Renderizar Imagen si existe adjunto de tipo imagen */}
                {item.attachmentUrl && item.attachmentType === 'image' && (
                  <TouchableOpacity 
                    onPress={() => {
                      setSelectedImage(normalizeUrl(item.attachmentUrl!) || null);
                      setViewerVisible(true);
                    }}
                    activeOpacity={0.9}
                  >
                    <Image 
                      source={{ uri: normalizeUrl(item.attachmentUrl!) }} 
                      style={styles.attachmentImage}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                )}

                {/* Renderizar Archivo/PDF si existe adjunto de tipo file */}
                {item.attachmentUrl && item.attachmentType === 'file' && (
                  <TouchableOpacity 
                    onPress={async () => {
                      const fullUrl = normalizeUrl(item.attachmentUrl!) || '';
                      
                      if (Platform.OS === 'web') {
                        window.open(fullUrl, '_blank');
                        return;
                      }

                      setIsDownloading(true);
                      try {
                        const filename = fullUrl.split('/').pop() || 'document.pdf';
                        const fileUri = `${FileSystem.documentDirectory}${filename}`;
                        const downloaded = await FileSystem.downloadAsync(fullUrl, fileUri);
                        
                        if (await Sharing.isAvailableAsync()) {
                          await Sharing.shareAsync(downloaded.uri);
                        } else {
                          Alert.alert('Error', 'No hay aplicaciones para abrir este archivo');
                        }
                      } catch (e) {
                         console.error("Open file error", e);
                         Alert.alert('Error', 'No se pudo abrir el archivo');
                      } finally {
                        setIsDownloading(false);
                      }
                    }}
                    style={styles.fileContainer}
                    activeOpacity={0.7}
                  >
                    <View style={styles.fileIconBox}>
                      <Ionicons name="document-text" size={24} color="#171717" />
                    </View>
                    <View style={styles.fileInfo}>
                      <Text style={[styles.fileName, item.sender === 'me' ? styles.fileNameMe : styles.fileNameOther]} numberOfLines={1}>
                        {item.text || 'Documento'}
                      </Text>
                      <Text style={[styles.fileAction, item.sender === 'me' ? styles.fileNameMe : styles.fileNameOther]}>
                        Tocar para abrir
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
                
                {item.text && item.attachmentType !== 'file' && (
                  <Text style={[
                    styles.messageText, 
                    item.sender === 'me' ? styles.messageTextMe : styles.messageTextOther,
                    (item.attachmentUrl && item.attachmentType === 'image') && { paddingHorizontal: 12, paddingBottom: 6 }
                  ]}>
                    {item.text}
                  </Text>
                )}
              </View>
              <Text style={styles.messageTime}>{item.time}</Text>
            </View>
          ))}
        </ScrollView>

        {/* Input Bar */}
        <View style={styles.inputBar}>
          <TouchableOpacity 
            style={styles.attachBtn} 
            onPress={handlePlusPress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={24} color="#737373" />
          </TouchableOpacity>
          <TextInput
            style={styles.textInput}
            placeholder="Escribí un mensaje..."
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
          <TouchableOpacity 
            style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]} 
            onPress={() => handleSend(inputText)}
            disabled={!inputText.trim()}
          >
            <Ionicons name="paper-plane" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Attachment Menu Modal */}
      <Modal
        visible={showPlusMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPlusMenu(false)}
      >
        <Pressable 
          style={styles.modalOverlay} 
          onPress={() => setShowPlusMenu(false)}
        >
          <View style={styles.modalContent}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <Text style={[styles.modalTitle, { marginBottom: 0 }]}>Adjuntar Archivo</Text>
              <TouchableOpacity onPress={() => setShowPlusMenu(false)}>
                <Ionicons name="close" size={24} color="#171717" />
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity 
              style={styles.modalItem} 
              onPress={() => { setShowPlusMenu(false); pickImage(false); }}
            >
              <View style={[styles.modalIcon, { backgroundColor: '#F3F4F6' }]}>
                <Ionicons name="image-outline" size={24} color="#737373" />
              </View>
              <Text style={styles.modalItemText}>Galería de Fotos</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.modalItem} 
              onPress={() => { setShowPlusMenu(false); pickImage(true); }}
            >
              <View style={[styles.modalIcon, { backgroundColor: '#F3F4F6' }]}>
                <Ionicons name="camera-outline" size={24} color="#737373" />
              </View>
              <Text style={styles.modalItemText}>Cámara</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.modalItem} 
              onPress={() => { setShowPlusMenu(false); pickDocument(); }}
            >
              <View style={[styles.modalIcon, { backgroundColor: '#F3F4F6' }]}>
                <Ionicons name="document-text-outline" size={24} color="#737373" />
              </View>
              <Text style={styles.modalItemText}>Documentos y Archivos</Text>
            </TouchableOpacity>




          </View>
        </Pressable>
      </Modal>

      {/* Date Options Modal */}
      <Modal visible={isDateOptionsModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { borderTopLeftRadius: 24, borderTopRightRadius: 24 }]}>
             <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
                <Text style={styles.modalTitle}>Fecha de vencimiento</Text>
                <TouchableOpacity onPress={() => setDateOptionsModalVisible(false)}>
                   <Ionicons name="close" size={24} color="#171717" />
                </TouchableOpacity>
             </View>
             {[
               { id: 'today', label: 'Hoy' },
               { id: '1week', label: 'Dentro de 1 semana' },
               { id: '15days', label: 'Dentro de 15 días' },
               { id: '1month', label: 'Dentro de 1 mes' },
               { id: 'custom', label: 'Seleccionar Fecha' },
             ].map((item) => (
               <TouchableOpacity 
                 key={item.id}
                 style={styles.modalItem} 
                 onPress={() => {
                   setDateOptionsModalVisible(false);
                   const today = new Date();
                   const addDays = (date: Date, days: number) => {
                     const res = new Date(date);
                     res.setDate(res.getDate() + days);
                     return res;
                   };
                   const addMonths = (date: Date, months: number) => {
                     const res = new Date(date);
                     res.setMonth(res.getMonth() + months);
                     return res;
                   };

                   if (item.id === 'custom') {
                     setShowDatePicker(true);
                   } else {
                     let d = today;
                     if (item.id === '1week') d = addDays(today, 7);
                     else if (item.id === '15days') d = addDays(today, 15);
                     else if (item.id === '1month') d = addMonths(today, 1);
                     applyDateChange(d);
                   }
                 }}
               >
                 <Text style={styles.modalItemText}>{item.label}</Text>
               </TouchableOpacity>
             ))}
          </View>
        </View>
      </Modal>

      {showDatePicker && (
        <NativeDatePicker
          value={ticket?.dueDate ? new Date(ticket.dueDate) : new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'calendar'}
          onChange={handleDateChange}
        />
      )}


      {/* Image Viewer Modal */}
      <Modal
        visible={viewerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setViewerVisible(false)}
      >
        <SafeAreaView style={styles.viewerContainer}>
          <View style={styles.viewerHeader}>
            <TouchableOpacity onPress={() => setViewerVisible(false)} style={styles.viewerBack}>
              <Ionicons name="close" size={28} color="white" />
            </TouchableOpacity>
            
            <View style={{ flexDirection: 'row', gap: 20 }}>
              <TouchableOpacity 
                disabled={isDownloading}
                onPress={async () => {
                  if (!selectedImage) return;

                  if (Platform.OS === 'web') {
                    window.open(selectedImage, '_blank');
                    return;
                  }

                  setIsDownloading(true);
                  try {
                    const filename = selectedImage.split('/').pop() || 'image.jpg';
                    const fileUri = `${FileSystem.documentDirectory}${filename}`;
                    const downloaded = await FileSystem.downloadAsync(selectedImage, fileUri);
                    
                    if (await Sharing.isAvailableAsync()) {
                      await Sharing.shareAsync(downloaded.uri);
                    } else {
                      Alert.alert('Error', 'Compartir no está disponible en este dispositivo');
                    }
                  } catch (e) {
                    console.error("Share error", e);
                    Alert.alert('Error', 'No se pudo compartir el archivo');
                  } finally {
                    setIsDownloading(false);
                  }
                }}
              >
                <Ionicons name="share-social-outline" size={24} color="white" />
              </TouchableOpacity>

              <TouchableOpacity 
                disabled={isDownloading || Platform.OS === 'web'}
                onPress={async () => {
                  if (!selectedImage) return;
                  if (Platform.OS === 'web') return;

                  setIsDownloading(true);
                  try {
                    const { status } = await MediaLibrary.requestPermissionsAsync();
                    if (status !== 'granted') {
                      Alert.alert('Permiso denegado', 'Necesitamos permiso para guardar en tu galería');
                      return;
                    }

                    const filename = selectedImage.split('/').pop() || 'image.jpg';
                    const fileUri = `${FileSystem.documentDirectory}${filename}`;
                    const downloaded = await FileSystem.downloadAsync(selectedImage, fileUri);
                    await MediaLibrary.saveToLibraryAsync(downloaded.uri);
                    Alert.alert('✓ Éxito', 'Imagen guardada en la galería');
                  } catch (e) {
                    console.error("Save error", e);
                    Alert.alert('Error', 'No se pudo guardar la imagen');
                  } finally {
                    setIsDownloading(false);
                  }
                }}
              >
                <Ionicons name="download-outline" size={24} color="white" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.viewerImageContainer}>
            {isDownloading && (
              <ActivityIndicator color="white" style={{ position: 'absolute', zIndex: 10 }} />
            )}
            <Image 
              source={{ uri: selectedImage || '' }} 
              style={styles.viewerImage} 
              resizeMode="contain" 
            />
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  backBtn: {
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  headerAvatarContainer: {
    marginRight: 12,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  headerAvatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: FontFamily.bold,
    color: '#171717',
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: FontFamily.medium,
    color: '#737373',
    marginTop: 2,
  },
  moreBtn: {
    padding: 4,
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  messagesContent: {
    padding: 20,
    paddingBottom: 10,
  },
  messageRow: {
    marginBottom: 16,
    width: '100%',
  },
  messageRowMe: {
    alignItems: 'flex-end',
  },
  messageRowOther: {
    alignItems: 'flex-start',
  },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 4,
    maxWidth: '85%',
  },
  bubbleMe: {
    backgroundColor: '#171717',
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  messageText: {
    fontSize: 15,
    fontFamily: FontFamily.regular,
    lineHeight: 20,
  },
  messageTextMe: {
    color: '#FFFFFF',
  },
  messageTextOther: {
    color: '#171717',
  },
  messageTime: {
    fontSize: 10,
    fontFamily: FontFamily.medium,
    color: '#A3A3A3',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
    gap: 12,
  },
  attachBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 10 : 8,
    paddingBottom: Platform.OS === 'ios' ? 10 : 8,
    maxHeight: 100,
    fontFamily: FontFamily.regular,
    fontSize: 15,
    color: '#171717',
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#171717',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  sendBtnDisabled: {
    backgroundColor: '#E5E5E5',
  },
  attachmentImage: {
    width: 200,
    height: 150,
    borderRadius: 12,
    marginBottom: 8,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: FontFamily.bold,
    color: '#171717',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 16,
  },
  modalIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalItemText: {
    fontSize: 16,
    fontFamily: FontFamily.medium,
    color: '#171717',
  },
  modalCancel: {
    marginTop: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontFamily: FontFamily.bold,
    color: '#737373',
  },
  viewerContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
  },
  viewerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    zIndex: 10,
  },
  viewerBack: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerImage: {
    width: '100%',
    height: '100%',
  },
  fileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 12,
    minWidth: 200,
    gap: 12,
  },
  fileIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontFamily: FontFamily.bold,
    marginBottom: 2,
  },
  fileNameMe: {
    color: '#FFFFFF',
  },
  fileNameOther: {
    color: '#171717',
  },
  fileAction: {
    fontSize: 11,
    fontFamily: FontFamily.medium,
    opacity: 0.7,
  },
  systemAlert: {
    flexDirection: 'row',
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    gap: 10,
  },
  systemAlertIcon: {
    marginTop: 2,
  },
  systemAlertText: {
    flex: 1,
    fontSize: 13,
    fontFamily: FontFamily.regular,
    color: '#0369A1',
    lineHeight: 18,
  },
  headerSpacer: {
    width: 32,
  },
});
