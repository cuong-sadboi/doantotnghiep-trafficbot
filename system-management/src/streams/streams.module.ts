import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { StreamsController } from './streams.controller';
import { StreamsService } from './streams.service';
import { StreamLogEntry } from './entities/stream-log-entry.entity';
import { StreamIngestState } from './entities/stream-ingest-state.entity';

@Module({
  imports: [HttpModule, TypeOrmModule.forFeature([StreamLogEntry, StreamIngestState])],
  controllers: [StreamsController],
  providers: [StreamsService],
})
export class StreamsModule {}
