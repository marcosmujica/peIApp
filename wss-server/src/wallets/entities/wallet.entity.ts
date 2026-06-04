import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany,
  JoinColumn, CreateDateColumn, UpdateDateColumn, DeleteDateColumn,
} from "typeorm";
import { User } from "../../users/entities/user.entity";

import { WalletDistributionList } from "./wallet-distribution-list.entity";
import { WalletGoal } from "./wallet-goal.entity";
import { WalletPanel } from "./wallet-panel.entity";
import { WalletCategory } from "./wallet-category.entity";
import { WalletMember } from "./wallet-member.entity";

export type WalletType = "personal" | "business" | "shared" | "mymoney" | "mypays" | "mycollects" | "products" | "otro" | "negocio_productos" | "negocio_servicios" | "compartido" | "community";

@Entity("wallets")
export class Wallet {
  @PrimaryGeneratedColumn("uuid", { name: "wallet_id" })
  walletId: string;

  @Column({ name: "name", length: 80 })
  name: string;

  @Column({ name: "type", type: "varchar", length: 20 })
  type: WalletType;

  @Column({ name: "currency", length: 3, default: "USD" })
  currency: string;

  @Column({ name: "default_payment_method", length: 500, nullable: true })
  defaultPaymentMethod: string;

  @Column({ name: "default_transaction_type", type: "varchar", length: 10, default: "expense" })
  defaultTransactionType: "income" | "expense";

  @Column({ name: "help_to_collect", type: "boolean", default: false })
  helpToCollect: boolean;

  @Column({ name: "balance", type: "decimal", precision: 14, scale: 2, default: 0 })
  balance: number;

  @Column({ name: "total_incomes", type: "decimal", precision: 14, scale: 2, default: 0 })
  totalIncomes: number;

  @Column({ name: "total_expenses", type: "decimal", precision: 14, scale: 2, default: 0 })
  totalExpenses: number;

  @Column({ name: "pending_incomes", type: "decimal", precision: 14, scale: 2, default: 0 })
  pendingIncomes: number;

  @Column({ name: "pending_expenses", type: "decimal", precision: 14, scale: 2, default: 0 })
  pendingExpenses: number;


  @Column({ name: "avatar_url", type: "text", nullable: true })
  avatarUrl: string;

  @Column({ name: "warning_threshold", type: "decimal", precision: 14, scale: 2, default: 0 })
  warningThreshold: number;

  @Column({ name: "alert_threshold", type: "decimal", precision: 14, scale: 2, default: 0 })
  alertThreshold: number;

  @Column({ name: "include_in_general_balance", type: "boolean", default: true })
  includeInGeneralBalance: boolean;

  @Column({ name: "owner_id", type: "uuid" })
  ownerId: string;

  @OneToMany(() => WalletDistributionList, (list) => list.wallet)
  distributionLists: WalletDistributionList[];

  @OneToMany(() => WalletMember, (member) => member.wallet)
  members: WalletMember[];

  @ManyToOne(() => User)
  @JoinColumn({ name: "owner_id" })
  owner: User;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;

  @OneToMany(() => WalletGoal, (goal) => goal.wallet)
  goals: WalletGoal[];

  @OneToMany(() => WalletPanel, (panel) => panel.wallet, { cascade: true })
  panels: WalletPanel[];

  @OneToMany(() => WalletCategory, (category) => category.wallet, { cascade: true })
  categories: WalletCategory[];

  @Column({ name: "ai_questions", type: "jsonb", nullable: true })
  aiQuestions: string[];

  @DeleteDateColumn({ name: "deleted_at", type: "timestamptz", nullable: true })
  deletedAt?: Date;
}
