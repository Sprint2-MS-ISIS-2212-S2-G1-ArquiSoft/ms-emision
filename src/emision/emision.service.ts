import {
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { isUUID } from 'class-validator';
import * as crypto from 'node:crypto';
import * as os from 'node:os';
import { Repository } from 'typeorm';
import { LifecycleService } from '../health/lifecycle.service';
import { SimulacionService } from '../simulacion/simulacion.service';
import { EmitirPolizaDto } from './dtos/emitir-poliza.dto';
import { Poliza } from './entities/poliza.entity';
import { EstadoPoliza } from './enums/estado-poliza.enum';

@Injectable()
export class EmisionService {
  private readonly logger = new Logger(EmisionService.name);
  private readonly replicaId: string;

  private emisionesExitosas = 0;
  private emisionesIdempotentes = 0;
  private erroresSimulados = 0;

  constructor(
    @InjectRepository(Poliza)
    private readonly polizaRepository: Repository<Poliza>,
    private readonly simulacion: SimulacionService,
    private readonly lifecycle: LifecycleService,
    private readonly config: ConfigService,
  ) {
    this.replicaId = this.config.get<string>('REPLICA_ID', os.hostname());
  }

  async emitirPoliza(
    dto: EmitirPolizaDto,
    idempotencyKey?: string,
  ): Promise<Poliza> {
    this.lifecycle.enterRequest();
    try {
      const estadoSim = this.simulacion.obtenerEstado();
      if (estadoSim.modo === 'caido') {
        this.erroresSimulados++;
        throw new ServiceUnavailableException(
          'Servicio de Emisión no disponible (fallo simulado)',
        );
      }

      if (estadoSim.modo === 'lento' && estadoSim.latenciaMs > 0) {
        await new Promise((resolve) =>
          setTimeout(resolve, estadoSim.latenciaMs),
        );
      }

      const claveSuscripcion =
        dto.suscripcionId ??
        (idempotencyKey && isUUID(idempotencyKey) ? idempotencyKey : null);

      if (claveSuscripcion) {
        const existente = await this.polizaRepository.findOne({
          where: { suscripcionId: claveSuscripcion },
        });
        if (existente) {
          this.emisionesIdempotentes++;
          return existente;
        }
      }

      const fechaInicioVigencia = new Date();
      const fechaFinVigencia = new Date(fechaInicioVigencia);
      fechaFinVigencia.setFullYear(fechaFinVigencia.getFullYear() + 1);

      const maxIntentos = 5;
      for (let intento = 1; intento <= maxIntentos; intento++) {
        const numeroPoliza = this.generarNumeroPoliza();
        const poliza = this.polizaRepository.create({
          numeroPoliza,
          estado: EstadoPoliza.ACTIVA,
          fechaInicioVigencia,
          fechaFinVigencia,
          clienteId: dto.clienteId,
          cotizacionId: dto.cotizacionId,
          suscripcionId: claveSuscripcion,
        });

        try {
          const guardada = await this.polizaRepository.save(poliza);
          this.emisionesExitosas++;
          return guardada;
        } catch (error) {
          const pgCode = this.extraerCodigoPg(error);
          if (pgCode === '23505') {
            // Si la colision fue por suscripcionId en carrera concurrente, devolvemos la poliza ya emitida.
            if (claveSuscripcion) {
              const existente = await this.polizaRepository.findOne({
                where: { suscripcionId: claveSuscripcion },
              });
              if (existente) {
                this.emisionesIdempotentes++;
                return existente;
              }
            }
            if (intento < maxIntentos) {
              this.logger.warn(
                `Colision de numeroPoliza (${numeroPoliza}), reintentando (${intento}/${maxIntentos})`,
              );
              continue;
            }
          }
          throw error;
        }
      }

      throw new ServiceUnavailableException(
        'No fue posible generar un numero de poliza unico',
      );
    } finally {
      this.lifecycle.exitRequest();
    }
  }

  async listarPolizas(
    clienteId?: string,
    numeroPoliza?: string,
  ): Promise<Poliza[]> {
    const where: Record<string, string> = {};
    if (clienteId) {
      where.clienteId = clienteId;
    }
    if (numeroPoliza) {
      where.numeroPoliza = numeroPoliza;
    }
    return this.polizaRepository.find({
      where,
      order: { fechaInicioVigencia: 'DESC' },
      take: 100,
    });
  }

  async obtenerPoliza(idONumero: string): Promise<Poliza> {
    const poliza = isUUID(idONumero)
      ? await this.polizaRepository.findOne({ where: { id: idONumero } })
      : await this.polizaRepository.findOne({
          where: { numeroPoliza: idONumero },
        });

    if (!poliza) {
      throw new NotFoundException(`Poliza ${idONumero} no encontrada`);
    }
    return poliza;
  }

  obtenerMetricas() {
    return {
      replicaId: this.replicaId,
      pid: process.pid,
      shuttingDown: this.lifecycle.isShuttingDown,
      enVuelo: this.lifecycle.activeRequests,
      emisionesExitosas: this.emisionesExitosas,
      emisionesIdempotentes: this.emisionesIdempotentes,
      erroresSimulados: this.erroresSimulados,
      simulacion: this.simulacion.obtenerEstado(),
    };
  }

  private generarNumeroPoliza(): string {
    const numero = crypto.randomInt(0, 100_000_000);
    return `POL-${numero.toString().padStart(8, '0')}`;
  }

  private extraerCodigoPg(error: unknown): string | undefined {
    if (error && typeof error === 'object') {
      const obj = error as { code?: unknown; driverError?: { code?: unknown } };
      if (typeof obj.code === 'string') {
        return obj.code;
      }
      if (obj.driverError && typeof obj.driverError.code === 'string') {
        return obj.driverError.code;
      }
    }
    return undefined;
  }
}
