import { Global, Module } from '@nestjs/common';
import { SimulacionController } from './simulacion.controller';
import { SimulacionService } from './simulacion.service';

@Global()
@Module({
  controllers: [SimulacionController],
  providers: [SimulacionService],
  exports: [SimulacionService],
})
export class SimulacionModule {}
