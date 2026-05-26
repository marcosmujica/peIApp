import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, DeleteDateColumn, ManyToOne, JoinColumn
} from "typeorm";
import { Wallet } from "../../wallets/entities/wallet.entity";
import { User } from "../../users/entities/user.entity";

@Entity("tickets")
export class Ticket {
  @PrimaryGeneratedColumn("uuid", { name: "ticket_id" })
  ticketId: string;

  @Column({ name: "owner_id", type: "uuid" })
  ownerId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: "owner_id" })
  owner: User;

  @Column({ name: "amount", type: "decimal", precision: 14, scale: 2 })
  amount: number;

  @Column({ name: "initial_amount", type: "decimal", precision: 14, scale: 2, nullable: true })
  initialAmount: number;

  @Column({ name: "amount_paid", type: "decimal", precision: 14, scale: 2, default: 0 })
  amountPaid: number;


  @Column({ name: "currency", length: 3, default: "USD" })
  currency: string;

  @Column({ name: "description", length: 255, nullable: true })
  description: string;

  @Column({ name: "due_date", type: "timestamptz" })
  dueDate: Date;

  @Column({ name: "initial_due_date", type: "timestamptz", nullable: true })
  initialDueDate: Date;

  @Column({ name: "status", length: 20, default: "completed" })
  status: "pending" | "completed" | "cancelled";

  @Column({ name: "type", length: 20, default: "ticket" })
  type: "ticket" | "transfer" | "adjustment";

  @Column({ name: "payment_method", length: 50, nullable: true })
  paymentMethod?: string;

  @Column({ name: "payment_procedure", type: "text", nullable: true })
  paymentProcedure?: string;

  @Column({ name: "private_note", type: "text", nullable: true })
  privateNote?: string;

  @Column({ name: "comment", type: "text", nullable: true })
  comment?: string;


  @Column({ name: "generate_peilink", default: false })
  generatePeilink: boolean;

  @Column({ name: "help_to_collect", type: "boolean", default: false })
  helpToCollect: boolean;

  @Column({ name: "expenses", type: "decimal", precision: 14, scale: 2, default: 0 })
  expenses: number;

  @Column({ name: "expenses_detail", type: "text", nullable: true })
  expensesDetail?: string;

  @Column({ name: "reference", length: 100, nullable: true })
  reference?: string;

  @Column({ name: "attachment_url", type: "text", nullable: true })
  attachmentUrl?: string;

  @Column({ name: "source", length: 50, default: "app" })
  source: string;

  @Column({ name: "source_info", type: "text", nullable: true })
  sourceInfo?: string;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;


  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;

  @DeleteDateColumn({ name: "deleted_at", type: "timestamptz", nullable: true })
  deletedAt?: Date;

  @Column({ name: "owner_rating", type: "int", nullable: true })
  ownerRating?: number;

  @Column({ name: "participant_rating", type: "int", nullable: true })
  participantRating?: number;

  @Column({ name: "short_id", length: 10, nullable: true })
  shortId: string;
}
