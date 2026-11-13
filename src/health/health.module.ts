import { Global, Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { LifecycleService } from './lifecycle.service';

@Global()
@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
  providers: [LifecycleService],
  exports: [LifecycleService],
})
export class HealthModule {}
