import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum FirewallAction {
  BLOCK = 'BLOCK',
  RATE_LIMIT = 'RATE_LIMIT',
}

@Entity({ name: 'blocked_ips' })
export class BlockedIp {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 64, unique: true })
  ip!: string;

  @Column({ type: 'enum', enum: FirewallAction, default: FirewallAction.BLOCK })
  action!: FirewallAction;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reason?: string | null;

  @Column({ type: 'int', nullable: true })
  requestsPerMinute?: number | null;

  @Column({ type: 'datetime', nullable: true })
  expiresAt?: Date | null;

  @CreateDateColumn()
  createdAt!: Date;
}
