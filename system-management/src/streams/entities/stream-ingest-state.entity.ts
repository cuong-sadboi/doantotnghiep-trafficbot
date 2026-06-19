import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

const BigIntTransformer = {
  to: (value?: number) => value ?? 0,
  from: (value: string | number | null) => (value ? Number(value) : 0),
};

@Entity({ name: 'stream_ingest_state' })
export class StreamIngestState {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  sourceKey!: string;

  @Column({ type: 'varchar', length: 2048 })
  sourceUrl!: string;

  @Column({ type: 'varchar', length: 256, nullable: true })
  apiToken?: string | null;

  @Column({ type: 'bigint', default: 0, transformer: BigIntTransformer })
  lastByteOffset!: number;

  @Column({ type: 'text', nullable: true })
  lastPartialLine?: string | null;

  @Column({ type: 'boolean', default: false })
  ddosEnabled!: boolean;

  @Column({ type: 'int', default: 100 })
  ddosThreshold!: number;

  @Column({ type: 'int', default: 60 })
  ddosLimitRpm!: number;

  @Column({ type: 'int', default: 24 })
  ddosLimitDuration!: number;

  @UpdateDateColumn()
  updatedAt!: Date;
}
