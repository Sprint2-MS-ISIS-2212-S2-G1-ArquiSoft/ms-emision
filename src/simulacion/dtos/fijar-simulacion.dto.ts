import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import type { ModoSimulacion } from '../simulacion.service';

export class FijarSimulacionDto {
  @IsIn(['normal', 'lento', 'caido', 'readiness_fallido', 'liveness_fallido'])
  modo!: ModoSimulacion;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(30_000)
  latenciaMs?: number;
}

export class KillSimulacionDto {
  @IsOptional()
  @IsIn(['SIGTERM', 'SIGKILL'])
  signal?: 'SIGTERM' | 'SIGKILL';
}
