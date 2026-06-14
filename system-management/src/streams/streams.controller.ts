import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { StreamsService } from './streams.service';

@Controller('streams')
export class StreamsController {
  constructor(private readonly streamsService: StreamsService) { }

  @Get('entries')
  getEntries(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('timeframe') timeframe?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const take = limit ? Number(limit) : 200;
    const skip = offset ? Number(offset) : 0;
    return this.streamsService.getEntries(take, skip, timeframe, startDate, endDate);
  }

  @Get('status')
  getStatus() {
    return this.streamsService.getStatus();
  }

  @Post('config')
  updateConfig(
    @Body() body: { sourceUrl: string; apiToken: string; sourceKey?: string },
  ) {
    return this.streamsService.updateConfig(
      body.sourceUrl,
      body.apiToken,
      body.sourceKey,
    );
  }

  @Post('sync')
  sync() {
    return this.streamsService.sync();
  }
}
