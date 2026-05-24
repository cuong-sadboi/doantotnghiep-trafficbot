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

  @Column({ type: 'bigint', default: 0, transformer: BigIntTransformer })
  lastByteOffset!: number;

  @Column({ type: 'text', nullable: true })
  lastPartialLine?: string | null;

  @UpdateDateColumn()
  updatedAt!: Date;
}
