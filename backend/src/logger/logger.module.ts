import { Module } from '@nestjs/common';
import { LoggingInterceptor } from './logger.service';

@Module({
  providers: [LoggingInterceptor]
})
export class LoggerModule {}
