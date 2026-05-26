import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn
} from "typeorm";
import { Wallet } from "./wallet.entity";

@Entity("wallets_goals")
export class WalletGoal {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "wallet_id", type: "uuid" })
  walletId: string;

  @Column({ name: "name", length: 150 })
  name: string;

  @Column({ name: "target_amount", type: "decimal", precision: 14, scale: 2, default: 0 })
  targetAmount: number;

  @Column({ name: "current_amount", type: "decimal", precision: 14, scale: 2, default: 0 })
  currentAmount: number;

  @Column({ name: "deadline", type: "timestamptz", nullable: true })
  deadline: Date;

  @ManyToOne(() => Wallet, (wallet) => wallet.goals, { onDelete: 'CASCADE' })
  @JoinColumn({ name: "wallet_id" })
  wallet: Wallet;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
