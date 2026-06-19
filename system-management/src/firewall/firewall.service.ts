import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { BlockedIp, FirewallAction } from './entities/blocked-ip.entity';

@Injectable()
export class FirewallService {
  private readonly logger = new Logger(FirewallService.name);

  constructor(
    @InjectRepository(BlockedIp)
    private readonly blockedIpRepository: Repository<BlockedIp>,
  ) {}

  async createRule(
    ip: string,
    action: FirewallAction,
    reason?: string,
    durationHours?: number,
    requestsPerMinute?: number,
  ): Promise<BlockedIp> {
    this.logger.log(`Creating firewall rule: IP=${ip}, action=${action}, durationHours=${durationHours}`);
    
    // Clean up expired rules first
    await this.cleanupExpiredRules();

    let expiresAt: Date | null = null;
    if (durationHours && durationHours > 0) {
      expiresAt = new Date();
      expiresAt.setTime(expiresAt.getTime() + durationHours * 60 * 60 * 1000);
    }

    let rule = await this.blockedIpRepository.findOne({ where: { ip } });
    if (rule) {
      rule.action = action;
      rule.reason = reason ?? rule.reason;
      rule.expiresAt = expiresAt;
      rule.requestsPerMinute = action === FirewallAction.RATE_LIMIT ? (requestsPerMinute ?? 60) : null;
    } else {
      rule = this.blockedIpRepository.create({
        ip,
        action,
        reason: reason ?? 'Manual block by admin',
        expiresAt,
        requestsPerMinute: action === FirewallAction.RATE_LIMIT ? (requestsPerMinute ?? 60) : null,
      });
    }

    return this.blockedIpRepository.save(rule);
  }

  async getRules(): Promise<BlockedIp[]> {
    await this.cleanupExpiredRules();
    return this.blockedIpRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async deleteRule(ip: string): Promise<boolean> {
    this.logger.log(`Removing firewall rule for IP: ${ip}`);
    const result = await this.blockedIpRepository.delete({ ip });
    return (result.affected ?? 0) > 0;
  }

  async checkIp(ip: string): Promise<{
    blocked: boolean;
    action: FirewallAction | null;
    reason: string | null;
    requestsPerMinute: number | null;
    expiresAt: Date | null;
  }> {
    const rule = await this.blockedIpRepository.findOne({ where: { ip } });
    if (!rule) {
      return { blocked: false, action: null, reason: null, requestsPerMinute: null, expiresAt: null };
    }

    const now = new Date();
    if (rule.expiresAt && rule.expiresAt < now) {
      // Rule expired, delete it asynchronously
      void this.blockedIpRepository.delete({ id: rule.id }).catch((err) => {
        this.logger.error(`Failed to delete expired rule: ${err.message}`);
      });
      return { blocked: false, action: null, reason: null, requestsPerMinute: null, expiresAt: null };
    }

    return {
      blocked: true,
      action: rule.action,
      reason: rule.reason ?? null,
      requestsPerMinute: rule.requestsPerMinute ?? null,
      expiresAt: rule.expiresAt ?? null,
    };
  }

  private async cleanupExpiredRules(): Promise<void> {
    try {
      const now = new Date();
      const result = await this.blockedIpRepository.delete({
        expiresAt: LessThan(now),
      });
      if (result.affected && result.affected > 0) {
        this.logger.log(`Cleaned up ${result.affected} expired firewall rules.`);
      }
    } catch (err: any) {
      this.logger.error(`Error cleaning up expired rules: ${err?.message}`);
    }
  }
}
