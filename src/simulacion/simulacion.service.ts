import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type ModoSimulacion =
  'normal' | 'lento' | 'caido' | 'readiness_fallido' | 'liveness_fallido';

const MODOS_VALIDOS: ModoSimulacion[] = [
  'normal',
  'lento',
  'caido',
  'readiness_fallido',
  'liveness_fallido',
];

@Injectable()
export class SimulacionService {
  private readonly logger = new Logger(SimulacionService.name);
  private modo: ModoSimulacion;
  private latenciaMs: number;

  constructor(private readonly config: ConfigService) {
    const modoInicial = this.config.get<string>('SIMULAR_MODO', 'normal');
    this.modo = MODOS_VALIDOS.includes(modoInicial as ModoSimulacion)
      ? (modoInicial as ModoSimulacion)
      : 'normal';
    this.latenciaMs = Number(
      this.config.get<string>('SIMULAR_LATENCIA_MS', '0'),
    );
  }

  fijar(modo: ModoSimulacion, latenciaMs?: number): void {
    this.modo = modo;
    if (latenciaMs !== undefined) {
      this.latenciaMs = latenciaMs;
    }
    this.logger.warn(
      `Simulacion actualizada -> modo=${this.modo}, latenciaMs=${this.latenciaMs}`,
    );
  }

  obtenerEstado(): { modo: ModoSimulacion; latenciaMs: number } {
    return {
      modo: this.modo,
      latenciaMs: this.latenciaMs,
    };
  }
}
