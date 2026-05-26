import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne,
  JoinColumn, CreateDateColumn,
} from "typeorm";
import { User } from "../../users/entities/user.entity";

@Entity("phone_otps")
export class PhoneOtp {
  @PrimaryGeneratedColumn("uuid", { name: "otp_id" })
  otpId: string;

  @Column({ name: "user_id", length: 20 })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column({ name: "otp_hash" })
  otpHash: string;

  @Column({ name: "expires_at", type: "timestamptz" })
  expiresAt: Date;

  @Column({ name: "used_at", type: "timestamptz", nullable: true })
  usedAt?: Date;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;
}
