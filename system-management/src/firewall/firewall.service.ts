import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { BlockedIp, FirewallAction } from './entities/blocked-ip.entity';

@Injectable()
export class FirewallService {
  private readonly logger = new Logger(FirewallService.name);

  constructor(
    @InjectRepository(BlockedIp)
    private readonly blockedIpRepository: Repository<BlockedIp>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  private async syncRulesToWebhook(): Promise<void> {
    const webhookUrl = this.configService.get<string>('FIREWALL_WEBHOOK_URL');
    const webhookToken = this.configService.get<string>('FIREWALL_WEBHOOK_TOKEN');

    if (!webhookUrl) {
      this.logger.warn('FIREWALL_WEBHOOK_URL is not configured. Webhook sync skipped.');
      return;
    }

    try {
      this.logger.log(`Syncing firewall rules to webhook: ${webhookUrl}`);
      const rules = await this.blockedIpRepository.find({
        order: { createdAt: 'DESC' },
      });

      const now = new Date();
      const activeRules = rules.filter(r => !r.expiresAt || r.expiresAt > now);

      const payload = {
        rules: activeRules.map(r => ({
          ip: r.ip,
          action: r.action,
          reason: r.reason,
          requestsPerMinute: r.requestsPerMinute,
        })),
      };

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (webhookToken) {
        headers['X-Firewall-Token'] = webhookToken;
      }

      await firstValueFrom(
        this.httpService.post(webhookUrl, payload, { headers, timeout: 5000 })
      );
      this.logger.log(`Successfully synced ${activeRules.length} rules to Django client.`);
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? err?.response?.data?.message ?? err?.message;
      this.logger.error(`Failed to sync firewall rules to Django client: ${msg}`);
    }
  }

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

    const saved = await this.blockedIpRepository.save(rule);
    
    // Trigger background webhook sync
    void this.syncRulesToWebhook().catch((err) => {
      this.logger.error(`Error in background webhook sync: ${err.message}`);
    });

    return saved;
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
    const affected = (result.affected ?? 0) > 0;
    if (affected) {
      // Trigger background webhook sync
      void this.syncRulesToWebhook().catch((err) => {
        this.logger.error(`Error in background webhook sync: ${err.message}`);
      });
    }
    return affected;
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
      void this.blockedIpRepository.delete({ id: rule.id }).then(() => {
        // Trigger sync when a rule is auto-deleted on check
        void this.syncRulesToWebhook().catch((err) => {
          this.logger.error(`Error in background webhook sync after auto-delete: ${err.message}`);
        });
      }).catch((err) => {
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
        // Trigger background webhook sync
        void this.syncRulesToWebhook().catch((err) => {
          this.logger.error(`Error in background webhook sync after cleanup: ${err.message}`);
        });
      }
    } catch (err: any) {
      this.logger.error(`Error cleaning up expired rules: ${err?.message}`);
    }
  }
}
