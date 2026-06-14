import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, Between, LessThanOrEqual } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { StreamLogEntry } from './entities/stream-log-entry.entity';
import { StreamIngestState } from './entities/stream-ingest-state.entity';

const LOG_REGEX = /^(\S+) - - \[(.+?)\] "(\S+) (\S+) \S+" (\d+) (\d+) ".*?" "(.*?)"/;

@Injectable()
export class StreamsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(StreamsService.name);
  private intervalId: NodeJS.Timeout | null = null;
  private isPolling = false;
  private sourceKey: string;
  private sourceUrl: string;
  private apiToken: string;
  private readonly pollIntervalMs: number;

  constructor(
    @InjectRepository(StreamLogEntry)
    private readonly entryRepository: Repository<StreamLogEntry>,
    @InjectRepository(StreamIngestState)
    private readonly stateRepository: Repository<StreamIngestState>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.sourceKey = this.configService.get<string>('STREAM_SOURCE_KEY') ?? 'pythonanywhere';
    this.sourceUrl = this.configService.get<string>('STREAM_SOURCE_URL') ?? '';
    this.apiToken = this.configService.get<string>('STREAM_API_TOKEN') ?? '';
    this.pollIntervalMs = Number(this.configService.get<string>('STREAM_POLL_INTERVAL_MS') ?? 60000);
  }

  async updateConfig(sourceUrl: string, apiToken: string, sourceKey = 'custom_site') {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.sourceUrl = sourceUrl;
    this.apiToken = apiToken;
    this.sourceKey = sourceKey;

    try {
      // Clear all log entries in DB so we don't mix logs
      await this.entryRepository.clear();

      // Update/Create state in DB
      const state = await this.getOrCreateState();
      state.sourceUrl = sourceUrl;
      state.lastByteOffset = 0;
      state.lastPartialLine = null;
      await this.stateRepository.save(state);

      this.logger.log(`Stream configuration updated. Source: ${sourceUrl}, Key: ${sourceKey}`);

      // Start fetching immediately
      await this.pollOnce();
    } catch (err: any) {
      this.logger.error(`Failed to apply new stream config: ${err?.message}`);
    }

    // Restart the polling interval
    this.intervalId = setInterval(() => this.pollOnce(), this.pollIntervalMs);

    return { success: true };
  }

  onModuleInit() {
    if (!this.sourceUrl || !this.apiToken) {
      this.logger.warn('Stream polling disabled: STREAM_SOURCE_URL or STREAM_API_TOKEN missing.');
      return;
    }

    this.pollOnce();
    this.intervalId = setInterval(() => this.pollOnce(), this.pollIntervalMs);
  }

  onModuleDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  async getEntries(limit = 200, offset = 0, timeframe?: string, startDate?: string, endDate?: string) {
    let whereClause: any = {};

    if (startDate || endDate) {
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;

      if (start && end) {
        whereClause.loggedAt = Between(start, end);
      } else if (start) {
        whereClause.loggedAt = MoreThanOrEqual(start);
      } else if (end) {
        whereClause.loggedAt = LessThanOrEqual(end);
      }
    } else if (timeframe) {
      const now = new Date();
      let startDate = new Date();

      if (timeframe === 'day') {
        startDate.setHours(0, 0, 0, 0);
      } else if (timeframe === 'week') {
        const day = startDate.getDay();
        const diff = startDate.getDate() - day + (day === 0 ? -6 : 1);
        startDate = new Date(startDate.setDate(diff));
        startDate.setHours(0, 0, 0, 0);
      } else if (timeframe === 'month') {
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
      }

      whereClause = {
        loggedAt: MoreThanOrEqual(startDate),
      };
    }

    const findOptions: any = {
      where: whereClause,
      order: { loggedAt: 'DESC', id: 'DESC' },
    };

    if (!timeframe && !startDate && !endDate) {
      findOptions.take = Math.min(Math.max(limit, 1), 500);
      findOptions.skip = Math.max(offset, 0);
    }

    return this.entryRepository.find(findOptions);
  }

  async getStatus() {
    const state = await this.stateRepository.findOne({ where: { sourceKey: this.sourceKey } });
    return {
      sourceKey: this.sourceKey,
      sourceUrl: state?.sourceUrl ?? this.sourceUrl,
      lastByteOffset: state?.lastByteOffset ?? 0,
      updatedAt: state?.updatedAt ?? null,
    };
  }

  async sync() {
    await this.pollOnce();
    return this.getStatus();
  }

  private async pollOnce() {
    if (this.isPolling) return;
    this.isPolling = true;

    try {
      const content = await this.fetchLogContent();
      if (!content) return;

      const buffer = Buffer.from(content, 'utf8');
      const currentBytes = buffer.length;

      const state = await this.getOrCreateState();
      let startOffset = state.lastByteOffset ?? 0;

      if (state.sourceUrl !== this.sourceUrl) {
        startOffset = 0;
        state.lastPartialLine = null;
        state.sourceUrl = this.sourceUrl;
      }

      if (currentBytes < startOffset) {
        startOffset = 0;
        state.lastPartialLine = null;
      }

      if (currentBytes === startOffset) {
        await this.stateRepository.update(
          { sourceKey: this.sourceKey },
          { updatedAt: new Date() }
        );
        return;
      }

      const newChunk = buffer.subarray(startOffset).toString('utf8');
      const merged = `${state.lastPartialLine ?? ''}${newChunk}`;
      const lines = merged.split(/\r?\n/);
      const lastLine = lines.pop() ?? '';
      const hasTrailingNewline = newChunk.endsWith('\n') || newChunk.endsWith('\r\n');
      const partialLine = hasTrailingNewline ? '' : lastLine;

      const entries = lines
        .map((line) => this.parseLine(line))
        .filter((entry): entry is StreamLogEntry => Boolean(entry))
        .map((entry) => ({ ...entry, sourceKey: this.sourceKey }));

      if (entries.length > 0) {
        await this.entryRepository.save(entries);
      }

      await this.stateRepository.save({
        ...state,
        sourceUrl: this.sourceUrl,
        lastByteOffset: currentBytes,
        lastPartialLine: partialLine || null,
      });
    } catch (error: any) {
      const message = error?.message ?? 'Unknown stream polling error';
      this.logger.error(`Stream poll failed: ${message}`);
    } finally {
      this.isPolling = false;
    }
  }

  private async fetchLogContent(): Promise<string | null> {
    const apiUrl = this.normalizePythonAnywhereUrl(this.sourceUrl);

    try {
      const response = await firstValueFrom(
        this.httpService.get(apiUrl, {
          responseType: 'text',
          headers: {
            Authorization: `Token ${this.apiToken}`,
          },
        }),
      );
      return typeof response.data === 'string' ? response.data : String(response.data ?? '');
    } catch (error: any) {
      const status = error?.response?.status;
      const message = error?.response?.data?.error ?? error?.response?.data?.message ?? error?.message ?? 'Fetch failed';
      this.logger.error(`Stream fetch failed (${status ?? 'unknown'}): ${message}`);
      return null;
    }
  }

  private normalizePythonAnywhereUrl(url: string): string {
    if (url.includes('/api/v0/user/')) {
      return url;
    }

    const match = url.match(/\/user\/([^/]+)\/files\/(.+)$/);
    if (!match) {
      return url;
    }

    const user = match[1];
    const filePath = match[2];
    return `https://www.pythonanywhere.com/api/v0/user/${user}/files/path/${filePath}`;
  }

  private parseLine(line: string): StreamLogEntry | null {
    const trimmed = line.trim();
    if (!trimmed) return null;

    const match = trimmed.match(LOG_REGEX);
    if (!match) return null;

    const [, ip, tsStr, method, path, status, size, userAgent] = match;
    const loggedAt = this.parseDate(tsStr);

    return this.entryRepository.create({
      sourceKey: this.sourceKey,
      ip,
      method,
      path,
      status: Number(status),
      size: Number(size),
      userAgent,
      loggedAt,
      rawLine: trimmed,
    });
  }

  private parseDate(tsStr: string): Date {
    const parts = tsStr.match(/^(\d+)\/(\w+)\/(\d+):(\d+):(\d+):(\d+) ([\+\-]\d+)$/);
    if (!parts) return new Date();

    const [, day, month, year, hour, minute, second] = parts;
    const months: Record<string, number> = {
      Jan: 0,
      Feb: 1,
      Mar: 2,
      Apr: 3,
      May: 4,
      Jun: 5,
      Jul: 6,
      Aug: 7,
      Sep: 8,
      Oct: 9,
      Nov: 10,
      Dec: 11,
    };

    return new Date(Date.UTC(Number(year), months[month], Number(day), Number(hour), Number(minute), Number(second)));
  }

  private async getOrCreateState(): Promise<StreamIngestState> {
    const existing = await this.stateRepository.findOne({ where: { sourceKey: this.sourceKey } });
    if (existing) return existing;

    const created = this.stateRepository.create({
      sourceKey: this.sourceKey,
      sourceUrl: this.sourceUrl,
      lastByteOffset: 0,
      lastPartialLine: null,
    });

    return this.stateRepository.save(created);
  }
}
