import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmisionModule } from './emision/emision.module';
import { HealthModule } from './health/health.module';
import { SimulacionModule } from './simulacion/simulacion.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: Number(config.get<string>('DB_PORT', '5438')),
        username: config.get<string>('DB_USER', 'emision'),
        password: config.get<string>('DB_PASSWORD', 'emision'),
        database: config.get<string>('DB_NAME', 'emision'),
        autoLoadEntities: true,
        synchronize: config.get<string>('DB_SYNCHRONIZE', 'true') === 'true',
        logging: config.get<string>('DB_LOGGING') === 'true',
        ssl:
          config.get<string>('DB_SSL') === 'true'
            ? { rejectUnauthorized: false }
            : false,
        extra: {
          max: Number(config.get<string>('DB_POOL_MAX', '10')),
          connectionTimeoutMillis: 2000,
        },
      }),
    }),
    SimulacionModule,
    HealthModule,
    EmisionModule,
  ],
})
export class AppModule {}
