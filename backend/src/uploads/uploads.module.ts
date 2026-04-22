import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller';
import { R2StorageService } from 'src/storage/r2-storage.service';

@Module({
  controllers: [UploadsController],
  providers: [R2StorageService],
})
export class UploadsModule {}
