import { Controller, Get, Query } from '@nestjs/common';
import { StreamsService } from './streams.service';

@Controller('streams')
export class StreamsController {
  constructor(private readonly streamsService: StreamsService) {}

  @Get('entries')
  getEntries(@Query('limit') limit?: string, @Query('offset') offset?: string) {
    const take = limit ? Number(limit) : 200;
    const skip = offset ? Number(offset) : 0;
    return this.streamsService.getEntries(take, skip);
  }

  @Get('status')
  getStatus() {
    return this.streamsService.getStatus();
  }
}
