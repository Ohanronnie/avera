import {
  BadRequestException,
  Controller,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { fileTypeFromBuffer } from 'file-type';
import { memoryStorage } from 'multer';
import * as path from 'path';
import { R2StorageService } from 'src/storage/r2-storage.service';

@Controller('uploads')
export class UploadsController {
  constructor(private readonly r2StorageService: R2StorageService) {}

  private readonly maxImageSize = 5 * 1024 * 1024;

  @Post('images')
  @UseInterceptors(
    FilesInterceptor('images', 5, {
      storage: memoryStorage(),
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
    }),
  )
  async uploadImages(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files?.length) {
      throw new BadRequestException('No files uploaded');
    }

    const savedFiles = await Promise.all(
      files.map(async (file) => {
        if (!file.buffer?.length) {
          throw new BadRequestException('Invalid image file');
        }

        if (file.buffer.length > this.maxImageSize) {
          throw new BadRequestException('File size should not exceed 5MB');
        }

        const detectedType = await fileTypeFromBuffer(file.buffer);
        if (!detectedType?.mime.startsWith('image/')) {
          throw new BadRequestException('Only image files are allowed');
        }

        const originalBaseName = path
          .basename(file.originalname || 'image')
          .replace(/\.[^/.]+$/, '')
          .replace(/[^a-zA-Z0-9._-]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
        const safeBaseName = originalBaseName || 'image';
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const filename = `${uniqueSuffix}-${safeBaseName}.${detectedType.ext}`;

        const imageUrl = await this.r2StorageService.uploadImage({
          key: filename,
          buffer: file.buffer,
          contentType: detectedType.mime,
        });

        return {
          path: imageUrl,
        };
      }),
    );

    return {
      files: savedFiles,
      message: savedFiles.length
        ? 'Files uploaded successfully'
        : 'No files uploaded',
    };
  }
}
