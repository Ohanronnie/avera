import {
  Controller,
  Post,
  UploadedFiles,
  UseInterceptors,
  BadRequestException,
  Req,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { UploadsService } from './uploads.service';

@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('images')
  @UseInterceptors(
    FilesInterceptor('images', 5, {
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
      fileFilter: (req, file, cb) => {
        const allowedMimeTypes =
          /^(image\/(png|jpe?g|bmp|webp|tiff?|svg\+xml))$/i;
        if (!allowedMimeTypes.test(file.mimetype)) {
          return cb(
            new BadRequestException('Only images files are allowed'),
            false,
          );
        }
        if (file.size > 5 * 1024 * 1024) {
          return cb(
            new BadRequestException('File size should not exceed 5MB'),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  uploadImages(@UploadedFiles() files: Express.Multer.File[], @Req() req: any) {
    console.log(files);
    if (!files) return false;
    return {
      files: files.map((file) => ({
        path: file.filename,
      })),
      message: files.length
        ? 'Files uploaded successfully'
        : 'No files uploaded',
    };
  }
}
