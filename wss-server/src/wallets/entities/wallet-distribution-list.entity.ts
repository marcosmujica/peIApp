import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne,
  JoinColumn, CreateDateColumn, UpdateDateColumn, DeleteDateColumn,
} from "typeorm";
import { Wallet } from "./wallet.entity";

@Entity("wallet_distribution_lists")
export class WalletDistributionList {
  @PrimaryGeneratedColumn("uuid", { name: "list_id" })
  id: string;

  @Column({ name: "wallet_id" })
  walletId: string;

  @Column({ name: "name", length: 100 })
  name: string;

  @Column({ name: "contacts", type: "json", nullable: true })
  contacts: Array<{
    name: string;
    phone: string;
  }>;

  @ManyToOne(() => Wallet)
  @JoinColumn({ name: "wallet_id" })
  wallet: Wallet;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;

  @DeleteDateColumn({ name: "deleted_at", type: "timestamptz", nullable: true })
  deletedAt?: Date;
}
