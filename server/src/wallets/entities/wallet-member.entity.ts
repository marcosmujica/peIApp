import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne,
  JoinColumn, CreateDateColumn, DeleteDateColumn, Index,
} from "typeorm";
import { User } from "../../users/entities/user.entity";
import { Wallet } from "./wallet.entity";

export type WalletRole = "owner" | "admin" | "operator" | "viewer";

@Entity("wallet_members")
@Index(["walletId", "userId"], { unique: true })
export class WalletMember {
  @PrimaryGeneratedColumn("uuid", { name: "member_id" })
  memberId: string;

  @Column({ name: "wallet_id" })
  walletId: string;

  @Column({ name: "user_id", type: "uuid" })
  userId: string;

  @Column({ name: "role", type: "varchar", length: 20 })
  role: WalletRole;

  @ManyToOne(() => Wallet)
  @JoinColumn({ name: "wallet_id" })
  wallet: Wallet;

  @ManyToOne(() => User)
  @JoinColumn({ name: "user_id" })
  user: User;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @DeleteDateColumn({ name: "deleted_at", type: "timestamptz", nullable: true })
  deletedAt?: Date;
}
