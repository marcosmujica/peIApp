import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from "typeorm";
import { Wallet } from "./wallet.entity";

@Entity("wallets_panels")
export class WalletPanel {
  @PrimaryGeneratedColumn("uuid", { name: "panel_id" })
  id: string;

  @Column({ name: "panel_name", type: "varchar", length: 100 })
  panelName: string;

  @Column({ name: "is_enabled", type: "boolean", default: true })
  isEnabled: boolean;

  @Column({ name: "display_order", type: "int", default: 0 })
  displayOrder: number;

  @Column({ name: "wallet_id" })
  walletId: string;

  @ManyToOne(() => Wallet, (wallet) => wallet.panels, { onDelete: 'CASCADE' })
  @JoinColumn({ name: "wallet_id" })
  wallet: Wallet;
}
