import { Controller, Post, Body, Get } from '@nestjs/common';
import { AiService, PredictDto } from './ai.service.js';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('predict')
  async predict(@Body() data: PredictDto) {
    return this.aiService.predict(data);
  }

  @Post('analyze-logs')
  async analyzeLogs(@Body('logText') logText: string) {
    return this.aiService.analyzeRawLogs(logText);
  }

  @Get('model-info')
  async getModelInfo() {
    return this.aiService.getModelInfo();
  }
}
