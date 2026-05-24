import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

export class PredictDto {
  requests_per_minute: number;
  session_duration: number;
  unique_pages: number;
  avg_click_interval: number;
  is_headless: number;
  user_agent_length: number;
  visit_count: number;
}

export interface PredictResponse {
  label: number;
  is_bot: boolean;
  confidence: number;
  probabilities: {
    real_user: number;
    bot: number;
  };
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly aiServiceUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.aiServiceUrl = this.configService.get<string>('AI_SERVICE_URL', 'http://localhost:5000');
  }

  async predict(data: PredictDto): Promise<PredictResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.post<PredictResponse>(`${this.aiServiceUrl}/predict`, data),
      );
      return response.data;
    } catch (error: any) {
      const status = error?.response?.status ?? HttpStatus.INTERNAL_SERVER_ERROR;
      const message =
        error?.response?.data?.error ??
        error?.response?.data?.message ??
        'Failed to get prediction';
      this.logger.error(`Failed to call AI Service: ${message}`);
      throw new HttpException(message, status);
    }
  }

  async analyzeRawLogs(logText: string): Promise<any> {
    const sessions = this.parseNginxLogs(logText);
    const features = this.engineerFeatures(sessions);

    if (features.length === 0) {
      return { results: [], total: 0, bots_detected: 0, stats: null };
    }

    // Aggregate stats for charts
    const statusCodes = {};
    const timeline = {}; // grouped by hour:minute
    let totalBandwidth = 0;

    for (const [ip, requests] of Object.entries(sessions)) {
      for (const req of requests as any[]) {
        // Status code count
        const status = req.status;
        statusCodes[status] = (statusCodes[status] || 0) + 1;

        // Bandwidth
        totalBandwidth += req.size || 0;

        // Timeline (e.g. "04:00 PM")
        const hour = req.timestamp.getHours();
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        const timeKey = `${displayHour.toString().padStart(2, '0')}:00 ${ampm}`;
        
        if (!timeline[timeKey]) timeline[timeKey] = { ok: 0, warning: 0, error: 0, bandwidth: 0 };
        
        if (status.startsWith('2')) timeline[timeKey].ok++;
        else if (status.startsWith('4')) timeline[timeKey].warning++;
        else if (status.startsWith('5')) timeline[timeKey].error++;
        
        timeline[timeKey].bandwidth += (req.size || 0) / (1024 * 1024); // MB
      }
    }

    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.aiServiceUrl}/predict/batch`, { sessions: features }),
      );

      const results = response.data.results.map((res: any, index: number) => ({
        ...res,
        ip: features[index].ip,
        visit_count: features[index].visit_count,
        unique_pages: features[index].unique_pages,
      }));

      return {
        results,
        total: response.data.total,
        bots_detected: response.data.bots_detected,
        stats: {
          statusCodes,
          totalBandwidth: +(totalBandwidth / (1024 * 1024)).toFixed(2), // MB
          avgResponseSize: +(totalBandwidth / response.data.total / 1024).toFixed(2), // KB
          timeline: Object.entries(timeline).map(([time, vals]: [string, any]) => ({
            time,
            ...vals,
            bandwidth: +vals.bandwidth.toFixed(2),
            // Add a sort key based on AM/PM and hour
            _sort: (time.includes('PM') ? 12 : 0) + (+time.split(':')[0] % 12)
          })).sort((a, b) => a._sort - b._sort)
          .map(({ _sort, ...rest }) => rest)
        }
      };
    } catch (error: any) {
      const status = error?.response?.status ?? HttpStatus.INTERNAL_SERVER_ERROR;
      const message =
        error?.response?.data?.error ??
        error?.response?.data?.message ??
        'AI Service Error';
      this.logger.error(`AI Service Error: ${message}`);
      throw new HttpException(message, status);
    }
  }

  private parseNginxLogs(logText: string): any {
    const sessions: Record<string, any[]> = {};
    const lines = logText.split(/\r?\n/).filter((l) => l.trim());
    // Extended regex to capture status and size
    const logRegex = /^(\S+) - - \[(.+?)\] "(\S+) (\S+) \S+" (\d+) (\d+) ".*?" "(.*?)"/;

    for (const line of lines) {
      const match = line.match(logRegex);
      if (!match) continue;
      const [_, ip, tsStr, method, path, status, size, ua] = match;
      const timestamp = this.parseDate(tsStr);
      if (!sessions[ip]) sessions[ip] = [];
      sessions[ip].push({ timestamp, path, ua, status, size: +size });
    }
    return sessions;
  }

  private parseDate(tsStr: string): Date {
    const parts = tsStr.match(/^(\d+)\/(\w+)\/(\d+):(\d+):(\d+):(\d+) ([\+\-]\d+)$/);
    if (!parts) return new Date();
    const [_, day, month, year, h, m, s, tz] = parts;
    const months: Record<string, number> = {
      Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
      Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
    };
    return new Date(Date.UTC(+year, months[month], +day, +h, +m, +s));
  }

  private engineerFeatures(sessions: Record<string, any[]>): any[] {
    const rows: any[] = [];
    for (const [ip, requests] of Object.entries(sessions)) {
      requests.sort((a, b) => a.timestamp - b.timestamp);
      const visit_count = requests.length;
      const unique_pages = new Set(requests.map((r) => r.path)).size;
      const ua = requests[0].ua;
      const duration = (requests[visit_count - 1].timestamp - requests[0].timestamp) / 1000;
      const rpm = duration > 0 ? (visit_count / duration) * 60 : visit_count * 60;

      rows.push({
        ip,
        requests_per_minute: +rpm.toFixed(4),
        session_duration: +duration.toFixed(2),
        unique_pages,
        avg_click_interval: visit_count > 1 ? +(duration / (visit_count - 1)).toFixed(4) : 0,
        is_headless: /bot|crawl|spider|headless/i.test(ua) ? 1 : 0,
        user_agent_length: ua.length,
        visit_count,
      });
    }
    return rows;
  }

  async getModelInfo(): Promise<any> {
    const response = await firstValueFrom(this.httpService.get(`${this.aiServiceUrl}/model/info`));
    return response.data;
  }
}
