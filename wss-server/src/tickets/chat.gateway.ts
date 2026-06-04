import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { TicketsService } from './tickets.service';
import * as fs from 'fs';
import * as path from 'path';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logPath = path.join(process.cwd(), 'logs', 'chat.log');

  constructor(private readonly ticketsService: TicketsService) {
    this.chatLog('ChatGateway initialized');
  }

  private chatLog(message: string) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}\n`;
    try {
      const logDir = path.dirname(this.logPath);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      fs.appendFileSync(this.logPath, logEntry);
    } catch (err) {
      console.error('Error writing to chat.log:', err);
    }
  }

  handleConnection(client: Socket) {
    const msg = `Client connected: ${client.id}`;
    console.log(msg);
    this.chatLog(msg);
  }

  handleDisconnect(client: Socket) {
    const msg = `Client disconnected: ${client.id}`;
    console.log(msg);
    this.chatLog(msg);
  }

  @SubscribeMessage('joinTicket')
  handleJoinTicket(
    @MessageBody() ticketId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.join(ticketId);
    const msg = `Client ${client.id} joined room ${ticketId}`;
    console.log(msg);
    this.chatLog(msg);
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(
    @MessageBody() data: { 
      ticketId: string; 
      senderId: string; 
      message: string; 
      senderName?: string;
      chatId?: string;
      attachmentUrl?: string;
      attachmentType?: string;
      createdAt?: string;
      replyToChatId?: string;
      replyToMessage?: string;
      replyToSenderName?: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    this.chatLog(`Message received from ${client.id} for ticket ${data.ticketId}: ${data.message || '[Attachment]'}`);
    const { ticketId, senderId, message, senderName, chatId, attachmentUrl, attachmentType, createdAt, replyToChatId, replyToMessage, replyToSenderName } = data;
    
    try {
      let emitData;

      // Si ya viene con un chatId real (no temporal), asumimos que fue guardado vía HTTP REST API
      if (chatId && !chatId.toString().startsWith('temp-')) {
        emitData = {
          chatId,
          ticketId,
          senderId,
          message,
          senderName,
          attachmentUrl,
          attachmentType,
          createdAt: createdAt || new Date().toISOString(),
          replyToChatId,
          replyToMessage,
          replyToSenderName,
        };
        this.chatLog(`Broadcasting existing message: ${chatId}`);
      } else {
        // Guardar en BD si no fue guardado previamente
        const saved = await this.ticketsService.addChatMessage(
          ticketId, 
          senderId, 
          message, 
          senderName,
          attachmentUrl,
          attachmentType,
          replyToChatId,
          replyToMessage,
          replyToSenderName
        );
        emitData = {
          chatId: saved.chatId,
          ticketId: saved.ticketId,
          senderId: saved.senderId,
          message: saved.message,
          senderName: saved.senderName,
          attachmentUrl: saved.attachmentUrl,
          attachmentType: saved.attachmentType,
          createdAt: saved.createdAt,
          replyToChatId: saved.replyToChatId,
          replyToMessage: saved.replyToMessage,
          replyToSenderName: saved.replyToSenderName,
        };
        this.chatLog(`Saved and broadcasting new message: ${saved.chatId}`);
      }
      
      this.server.to(ticketId).emit('newMessage', emitData);
      
      // Lógica de Notificación: Primer mensaje del ticket en ESTA sesión de WS
      if (!(client as any).notifiedTickets) {
        (client as any).notifiedTickets = new Set<string>();
      }

      if (!(client as any).notifiedTickets.has(ticketId)) {
        this.chatLog(`[Notification] First message of session for ticket ${ticketId}. Triggering logic...`);
        
        const ticket = await this.ticketsService.findOne(ticketId);
        const ticketDesc = ticket?.description ? ` en "${ticket.description}"` : '';

        const preview = message 
          ? (message.length > 40 ? message.substring(0, 40) + '...' : message)
          : (attachmentUrl ? 'un archivo adjunto' : 'un mensaje');
        
        await this.ticketsService.sendTicketNotification(
          ticketId, 
          senderId, 
          `Mensaje${ticketDesc}: "${preview}"`,
          senderName
        );
        (client as any).notifiedTickets.add(ticketId);
      } else {
        this.chatLog(`[Notification] Already notified for ticket ${ticketId} in this session.`);
      }
    } catch (err) {
      const errMsg = `Error processing message from ${client.id}: ${err.message}`;
      console.error(errMsg);
      this.chatLog(`ERROR: ${errMsg}`);
    }
  }
}
