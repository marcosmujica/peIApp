import {
  Entity, Column, PrimaryGeneratedColumn, CreateDateColumn,
} from "typeorm";

@Entity("helpdesk")
export class HelpDesk {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "user_id", type: "uuid", nullable: true })
  userId: string | null;

  @Column({ type: "text" })
  message: string;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;
}
