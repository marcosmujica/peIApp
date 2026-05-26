import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn
} from "typeorm";
import { Ticket } from "./ticket.entity";
import { User } from "../../users/entities/user.entity";

@Entity("ticket_logs")
export class TicketLog {
  @PrimaryGeneratedColumn("uuid", { name: "log_id" })
  logId: string;

  @Column({ name: "ticket_id", type: "uuid" })
  ticketId: string;


  @ManyToOne(() => Ticket)
  @JoinColumn({ name: "ticket_id" })
  ticket: Ticket;

  @Column({ name: "user_id", type: "uuid" })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column({ name: "action", length: 100 })
  action: string;

  @Column({ name: "old_value", type: "text", nullable: true })
  oldValue: string;

  @Column({ name: "new_value", type: "text" })
  newValue: string;

  @Column({ name: "payment_method", length: 50, nullable: true })
  paymentMethod?: string;

  @Column({ name: "comment", type: "text", nullable: true })
  comment?: string;

  @Column({ name: "attachment_url", type: "text", nullable: true })
  attachmentUrl?: string;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

}
