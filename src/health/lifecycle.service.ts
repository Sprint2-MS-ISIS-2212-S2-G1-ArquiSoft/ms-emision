import {
  BeforeApplicationShutdown,
  Global,
  Injectable,
  Logger,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Global()
@Injectable()
export class LifecycleService
  implements BeforeApplicationShutdown, OnApplicationShutdown
{
  private readonly logger = new Logger(LifecycleService.name);
  private shuttingDown = false;
  private inFlight = 0;

  constructor(private readonly config: ConfigService) {}

  get isShuttingDown(): boolean {
    return this.shuttingDown;
  }

  get activeRequests(): number {
    return this.inFlight;
  }

  enterRequest(): void {
    this.inFlight++;
  }

  exitRequest(): void {
    if (this.inFlight > 0) {
      this.inFlight--;
    }
  }

  async beforeApplicationShutdown(signal?: string): Promise<void> {
    this.shuttingDown = true;
    const resiliencia =
      this.config.get<string>('RESILIENCIA_HABILITADA', 'true') === 'true';

    if (!resiliencia) {
      this.logger.warn(
        `Apagado inmediato sin drenado (RESILIENCIA_HABILITADA=false, signal=${signal ?? 'unknown'})`,
      );
      return;
    }

    const drainMs = Number(
      this.config.get<string>('SHUTDOWN_DRAIN_MS', '5000'),
    );
    this.logger.warn(
      `Graceful shutdown iniciado (signal=${signal ?? 'unknown'}). Readiness en 503; drenando conexiones durante ${drainMs} ms (enVuelo=${this.inFlight})`,
    );

    const inicio = Date.now();
    await new Promise((resolve) => setTimeout(resolve, drainMs));

    // Espera breve adicional si aun queda alguna transaccion en curso tras el drenado inicial.
    const topeExtra = inicio + drainMs + 2000;
    while (this.inFlight > 0 && Date.now() < topeExtra) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    this.logger.log(
      `Drenado completado en ${Date.now() - inicio} ms (enVuelo=${this.inFlight})`,
    );
  }

  onApplicationShutdown(signal?: string): void {
    this.logger.log(
      `Aplicacion detenida limpiamente (signal=${signal ?? 'unknown'})`,
    );
  }
}
