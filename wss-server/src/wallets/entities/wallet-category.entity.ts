import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from "typeorm";
import { Wallet } from "./wallet.entity";

@Entity("wallets_categories")
export class WalletCategory {
  @PrimaryGeneratedColumn("uuid", { name: "category_id" })
  id: string;

  @Column({ name: "category_key", type: "varchar", length: 100 })
  categoryKey: string;

  @Column({ name: "type", type: "varchar", length: 10 })
  type: "income" | "expense";

  @Column({ name: "is_enabled", type: "boolean", default: true })
  isEnabled: boolean;

  @Column({ name: "wallet_id" })
  walletId: string;

  @ManyToOne(() => Wallet, { onDelete: 'CASCADE' })
  @JoinColumn({ name: "wallet_id" })
  wallet: Wallet;
}
