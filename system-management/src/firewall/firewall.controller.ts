import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { FirewallService } from './firewall.service';
import { FirewallAction } from './entities/blocked-ip.entity';

@Controller('firewall')
export class FirewallController {
  constructor(private readonly firewallService: FirewallService) {}

  @Get('rules')
  getRules() {
    return this.firewallService.getRules();
  }

  @Post('rules')
  createRule(
    @Body()
    body: {
      ip: string;
      action: FirewallAction;
      reason?: string;
      durationHours?: number;
      requestsPerMinute?: number;
    },
  ) {
    return this.firewallService.createRule(
      body.ip,
      body.action,
      body.reason,
      body.durationHours,
      body.requestsPerMinute,
    );
  }

  @Delete('rules/:ip')
  deleteRule(@Param('ip') ip: string) {
    return this.firewallService.deleteRule(ip);
  }

  @Get('check')
  checkIp(@Query('ip') ip: string) {
    return this.firewallService.checkIp(ip);
  }
}
