import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'stream_log_entries' })
@Index(['sourceKey', 'loggedAt'])
@Index(['ip'])
@Index(['status'])
export class StreamLogEntry {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 64 })
  sourceKey!: string;

  @Column({ type: 'varchar', length: 64 })
  ip!: string;

  @Column({ type: 'varchar', length: 12 })
  method!: string;

  @Column({ type: 'varchar', length: 2048 })
  path!: string;

  @Column({ type: 'int' })
  status!: number;

  @Column({ type: 'int' })
  size!: number;

  @Column({ type: 'varchar', length: 512 })
  userAgent!: string;

  @Column({ type: 'datetime' })
  loggedAt!: Date;

  @Column({ type: 'text' })
  rawLine!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
