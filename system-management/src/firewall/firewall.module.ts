import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { BlockedIp } from './entities/blocked-ip.entity';
import { FirewallController } from './firewall.controller';
import { FirewallService } from './firewall.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([BlockedIp]),
    HttpModule,
  ],
  controllers: [FirewallController],
  providers: [FirewallService],
  exports: [FirewallService],
})
export class FirewallModule {}
