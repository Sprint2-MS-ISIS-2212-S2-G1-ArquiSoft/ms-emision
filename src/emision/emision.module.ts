import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmisionController } from './emision.controller';
import { EmisionService } from './emision.service';
import { Poliza } from './entities/poliza.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Poliza])],
  controllers: [EmisionController],
  providers: [EmisionService],
  exports: [EmisionService],
})
export class EmisionModule {}
