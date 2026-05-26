import {
  Entity, Column, PrimaryColumn, CreateDateColumn,
  UpdateDateColumn, DeleteDateColumn,
} from "typeorm";

@Entity("users")
export class User {
  @PrimaryColumn({ name: "user_id", length: 20 })
  userId: string; // E.164 phone number

  @Column({ name: "long_user_id", unique: true })
  longUserId: string; // UUID

  @Column({ name: "display_name", nullable: true })
  displayName?: string;

  @Column({ name: "avatar_url", nullable: true })
  avatarUrl?: string;

  @Column({ name: "country", default: "AR" })
  country: string;

  @Column({ name: "currency", default: "USD" })
  currency: string;

  @Column({ name: "default_payment_procedure", nullable: true })
  defaultPaymentProcedure?: string;

  @Column({ name: "gender", nullable: true })
  gender?: string;

  @Column({ name: "age", type: "int", nullable: true })
  age?: number;

  @Column({ name: "push_enabled", default: true })
  pushEnabled: boolean;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;

  @DeleteDateColumn({ name: "deleted_at", type: "timestamptz", nullable: true })
  deletedAt?: Date;

  @Column({ name: "theme", default: "light" })
  theme: string;

  @Column({ name: "default_wallet_id", nullable: true })
  defaultWalletId?: string;

  @Column({ name: "notification_id", nullable: true })
  notificationId?: string;

  @Column({ name: "preferred_notification_time", length: 5, default: "09:00" })
  preferredNotificationTime: string;

  @Column({ name: "daily_reports_enabled", default: true })
  dailyReportsEnabled: boolean;

  @Column({ name: "monthly_reports_enabled", default: true })
  monthlyReportsEnabled: boolean;

  @Column({ name: "transaction_notifications_enabled", default: true })
  transactionNotificationsEnabled: boolean;

  @Column({ name: "last_access", type: "timestamptz", nullable: true })
  lastAccess?: Date;
}
