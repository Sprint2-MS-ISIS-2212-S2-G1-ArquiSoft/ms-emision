import { IsOptional, IsUUID } from 'class-validator';

export class EmitirPolizaDto {
  @IsUUID()
  cotizacionId!: string;

  @IsUUID()
  clienteId!: string;

  @IsOptional()
  @IsUUID()
  suscripcionId?: string;
}
