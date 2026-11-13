import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  HealthCheck,
  HealthCheckError,
  HealthCheckResult,
  HealthCheckService,
  HealthIndicatorResult,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import * as os from 'node:os';
import { SimulacionService } from '../simulacion/simulacion.service';
import { LifecycleService } from './lifecycle.service';

@Controller('health')
export class HealthController {
  private readonly readinessTimeoutMs: number;
  private readonly replicaId: string;

  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
    private readonly lifecycle: LifecycleService,
    private readonly simulacion: SimulacionService,
    private readonly config: ConfigService,
  ) {
    this.readinessTimeoutMs = Number(
      this.config.get<string>('READINESS_DB_TIMEOUT_MS', '1500'),
    );
    this.replicaId = this.config.get<string>('REPLICA_ID', os.hostname());
  }

  /**
   * Liveness Probe desacoplada de la BD: verifica unicamente que el proceso
   * NestJS siga vivo y respondiendo al event loop (reinicio por fallo de proceso).
   */
  @Get('liveness')
  @HealthCheck()
  liveness(): Promise<HealthCheckResult> {
    return this.health.check([
      (): HealthIndicatorResult => {
        const { modo } = this.simulacion.obtenerEstado();
        if (modo === 'liveness_fallido') {
          throw new HealthCheckError('Liveness fallido simulado', {
            process: { status: 'down', replicaId: this.replicaId, modo },
          });
        }
        return {
          process: {
            status: 'up',
            replicaId: this.replicaId,
            pid: process.pid,
          },
        };
      },
    ]);
  }

  /**
   * Readiness Probe: valida el estado de drenado (Graceful Shutdown) y la
   * conectividad real del pool de PostgreSQL via @nestjs/terminus.
   */
  @Get('readiness')
  @HealthCheck()
  readiness(): Promise<HealthCheckResult> {
    return this.health.check([
      (): HealthIndicatorResult => {
        if (this.lifecycle.isShuttingDown) {
          throw new HealthCheckError('Replica en drenado de conexiones', {
            lifecycle: {
              status: 'down',
              shuttingDown: true,
              replicaId: this.replicaId,
            },
          });
        }
        const { modo } = this.simulacion.obtenerEstado();
        if (modo === 'readiness_fallido' || modo === 'caido') {
          throw new HealthCheckError(`Readiness deshabilitado (${modo})`, {
            simulacion: {
              status: 'down',
              modo,
              replicaId: this.replicaId,
            },
          });
        }
        return {
          lifecycle: {
            status: 'up',
            shuttingDown: false,
            replicaId: this.replicaId,
          },
        };
      },
      () =>
        this.db.pingCheck('database', {
          timeout: this.readinessTimeoutMs,
        }),
    ]);
  }

  /** Alias general para balanceadores (ALB / Docker Compose). */
  @Get()
  @HealthCheck()
  check(): Promise<HealthCheckResult> {
    return this.readiness();
  }
}
