import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isUUID } from 'class-validator';
import type { Response } from 'express';
import * as os from 'node:os';
import { EmitirPolizaDto } from './dtos/emitir-poliza.dto';
import { Poliza } from './entities/poliza.entity';
import { EmisionService } from './emision.service';

@Controller()
export class EmisionController {
  private readonly replicaId: string;

  constructor(
    private readonly emisionService: EmisionService,
    private readonly config: ConfigService,
  ) {
    this.replicaId = this.config.get<string>('REPLICA_ID', os.hostname());
  }

  @Post('polizas')
  async emitir(
    @Body() dto: EmitirPolizaDto,
    @Headers('x-idempotency-key') idempotencyKey: string | undefined,
    @Headers('x-socio-id') socioId: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ): Promise<Poliza> {
    if (!socioId || !isUUID(socioId)) {
      throw new BadRequestException('Header X-Socio-Id requerido');
    }
    res.setHeader('X-Emision-Replica', this.replicaId);
    return this.emisionService.emitirPoliza(dto, idempotencyKey);
  }

  @Get('polizas')
  listar(
    @Query('clienteId') clienteId?: string,
    @Query('numeroPoliza') numeroPoliza?: string,
  ): Promise<Poliza[]> {
    return this.emisionService.listarPolizas(clienteId, numeroPoliza);
  }

  @Get('polizas/numero/:numeroPoliza')
  obtenerPorNumero(
    @Param('numeroPoliza') numeroPoliza: string,
  ): Promise<Poliza> {
    return this.emisionService.obtenerPoliza(numeroPoliza);
  }

  @Get('polizas/:id')
  obtener(@Param('id') id: string): Promise<Poliza> {
    return this.emisionService.obtenerPoliza(id);
  }

  @Get('metricas')
  metricas() {
    return this.emisionService.obtenerMetricas();
  }
}
