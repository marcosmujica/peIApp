import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, ManyToOne, JoinColumn
} from "typeorm";
import { User } from "../../users/entities/user.entity";
import { Wallet } from "../../wallets/entities/wallet.entity";

@Entity("recurring_tickets")
export class RecurringTicket {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "owner_id", type: "uuid" })
  ownerId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: "owner_id" })
  owner: User;

  @Column({ name: "wallet_id" })
  walletId: string;

  @ManyToOne(() => Wallet)
  @JoinColumn({ name: "wallet_id" })
  wallet: Wallet;

  @Column({ type: "decimal", precision: 14, scale: 2 })
  amount: number;

  @Column({ length: 3 })
  currency: string;

  @Column({ length: 255 })
  description: string;

  @Column({ name: "payment_procedure", type: "text", nullable: true })
  paymentProcedure?: string;

  @Column({ name: "private_note", type: "text", nullable: true })
  privateNote?: string;

  @Column({ name: "comment", type: "text", nullable: true })
  comment?: string;

  @Column({ name: "help_to_collect", type: "boolean", default: false })
  helpToCollect: boolean;

  @Column({ name: "frequency", length: 50 }) 
  // 'weekly', 'biweekly', 'monthly', 'bimonthly', 'semi-annually', 'yearly'
  frequency: string;

  @Column({ name: "total_installments", type: "int" })
  totalInstallments: number;

  @Column({ name: "current_installment", type: "int", default: 0 })
  currentInstallment: number;

  @Column({ name: "last_generated_date", type: "timestamptz", nullable: true })
  lastGeneratedDate?: Date;

  @Column({ name: "next_generation_date", type: "timestamptz" })
  nextGenerationDate: Date;

  @Column({ name: "is_active", type: "boolean", default: true })
  isActive: boolean;

  @Column({ name: "category_id", nullable: true })
  categoryId: string;

  @Column({ name: "rubro", nullable: true })
  rubro: string;

  @Column({ name: "type", length: 20, default: "ticket" })
  type: string;

  @Column({ type: "jsonb", nullable: true })
  participants: any[];

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;

  @Column({ name: "short_id", length: 10, nullable: true })
  shortId: string;

  @Column({ name: "to_wallet_id", nullable: true })
  toWalletId?: string;

  @Column({ name: "to_rubro", nullable: true })
  toRubro?: string;
}
