import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AiService } from './ai.service.js';
import { AiController } from './ai.controller.js';

@Module({
  imports: [HttpModule],
  providers: [AiService],
  controllers: [AiController],
  exports: [AiService],
})
export class AiServiceModule {}
