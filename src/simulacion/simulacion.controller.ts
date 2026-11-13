import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  Logger,
  Post,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as os from 'node:os';
import {
  FijarSimulacionDto,
  KillSimulacionDto,
} from './dtos/fijar-simulacion.dto';
import { SimulacionService } from './simulacion.service';

@Controller('simulacion')
export class SimulacionController {
  private readonly logger = new Logger(SimulacionController.name);

  constructor(
    private readonly simulacion: SimulacionService,
    private readonly config: ConfigService,
  ) {}

  @Get('estado')
  estado() {
    this.verificarHabilitado();
    return {
      replicaId: this.config.get<string>('REPLICA_ID', os.hostname()),
      pid: process.pid,
      ...this.simulacion.obtenerEstado(),
    };
  }

  @Post('emision')
  @HttpCode(200)
  fijar(@Body() dto: FijarSimulacionDto) {
    this.verificarHabilitado();
    this.simulacion.fijar(dto.modo, dto.latenciaMs);
    return {
      replicaId: this.config.get<string>('REPLICA_ID', os.hostname()),
      ...this.simulacion.obtenerEstado(),
    };
  }

  @Post('kill')
  @HttpCode(202)
  matarProceso(@Body() dto: KillSimulacionDto) {
    this.verificarHabilitado();
    const signal = dto.signal ?? 'SIGTERM';
    const replicaId = this.config.get<string>('REPLICA_ID', os.hostname());
    this.logger.error(
      `[${replicaId}] Terminacion solicitada por endpoint de caos: ${signal}`,
    );

    // Se agenda en un tick corto para entregar el 202 antes de ejecutar la senal.
    setTimeout(() => {
      process.kill(process.pid, signal);
    }, 50);

    return {
      replicaId,
      pid: process.pid,
      signal,
      mensaje: `Senal ${signal} programada en 50 ms`,
    };
  }

  private verificarHabilitado(): void {
    if (this.config.get<string>('SIMULACION_ADMIN_HABILITADA') === 'false') {
      throw new ForbiddenException('Simulacion deshabilitada');
    }
  }
}
