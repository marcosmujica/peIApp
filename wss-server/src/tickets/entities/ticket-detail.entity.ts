import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, ManyToOne, JoinColumn
} from "typeorm";
import { Ticket } from "./ticket.entity";
import { User } from "../../users/entities/user.entity";
import { Wallet } from "../../wallets/entities/wallet.entity";

@Entity("ticket_details")
export class TicketDetail {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "ticket_id" })
  ticketId: string;

  @ManyToOne(() => Ticket, { onDelete: 'CASCADE' })
  @JoinColumn({ name: "ticket_id" })
  ticket: Ticket;

  @Column({ name: "user_id", type: "uuid" })
  userId: string;

  @ManyToOne(() => User, { createForeignKeyConstraints: false })
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column({ name: "wallet_id", nullable: true })
  walletId: string | null;

  @ManyToOne(() => Wallet, { nullable: true })
  @JoinColumn({ name: "wallet_id" })
  wallet: Wallet | null;

  @Column({ name: "role", type: "varchar", length: 255 }) // 'owner' or 'receiver'
  role: string;

  @Column({ name: "type", type: "varchar", length: 20 }) // 'income' or 'expense'
  type: string;

  @Column({ name: "rubro", type: "varchar", length: 255, nullable: true })
  rubro: string | null;

  @Column({ name: "description", type: "varchar", length: 255, nullable: true })
  description: string | null;
  
  @Column({ name: "private_note", type: "text", nullable: true })
  privateNote: string | null;


  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
