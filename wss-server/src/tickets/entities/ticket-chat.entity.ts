import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn
} from "typeorm";
import { Ticket } from "./ticket.entity";
import { User } from "../../users/entities/user.entity";

@Entity("ticket_chat")
export class TicketChat {
  @PrimaryGeneratedColumn("uuid", { name: "chat_id" })
  chatId: string;

  @Column({ name: "ticket_id", type: "uuid" })
  ticketId: string;

  @ManyToOne(() => Ticket)
  @JoinColumn({ name: "ticket_id" })
  ticket: Ticket;

  @Column({ name: "sender_id", length: 20 })
  senderId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: "sender_id" })
  sender: User;

  @Column({ name: "message", type: "text", nullable: true })
  message: string;

  @Column({ name: "sender_name", length: 100, nullable: true })
  senderName?: string;

  @Column({ name: "attachment_url", type: "text", nullable: true })
  attachmentUrl?: string;

  @Column({ name: "attachment_type", length: 20, nullable: true })
  attachmentType?: string;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;
}
