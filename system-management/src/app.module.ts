import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { AiModule } from './ai-service/ai.module';
import { StreamsModule } from './streams/streams.module';


@Module({
  imports: [
    UsersModule,
    AuthModule,
    AiModule,
    StreamsModule,
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const host = configService.get<string>('MYSQL_HOST');
        const username = configService.get<string>('MYSQL_USER');
        const password = configService.get<string>('MYSQL_PASSWORD');
        const database = configService.get<string>('MYSQL_DATABASE');

        if (!host || !username || !database) {
          throw new Error('MySQL config is missing (MYSQL_HOST/USER/DATABASE)');
        }

        return {
          type: 'mysql' as const,
          host,
          port: Number(configService.get<string>('MYSQL_PORT') ?? 3306),
          username,
          password,
          database,
          autoLoadEntities: true,
          synchronize: configService.get<string>('MYSQL_SYNCHRONIZE') === 'true',
          logging: configService.get<string>('MYSQL_LOGGING') === 'true',
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
