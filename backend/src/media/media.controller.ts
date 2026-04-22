import { Controller, Get, Param, Res, NotFoundException } from '@nestjs/common';
import type { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { lookup } from 'mime-types';
import { MediaService } from './media.service';

@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  // Directory containing legacy local uploaded files (root-relative).
  private readonly uploadsDir = path.resolve(process.cwd(), 'uploads');

  // Allow only safe filenames: letters, numbers, dot, dash, underscore.
  // Reject names starting with dot or containing `..` to prevent traversal and hidden files.
  private isSafeFilename(filename: string) {
    return (
      typeof filename === 'string' &&
      /^[a-zA-Z0-9._-]+$/.test(filename) &&
      !filename.includes('..') &&
      !filename.startsWith('.')
    );
  }

  @Get(':filename')
  async getFile(@Param('filename') filename: string, @Res() res: Response) {
    if (!this.isSafeFilename(filename)) {
      // Do not reveal details about why the file is unavailable
      throw new NotFoundException();
    }

    try {
      const filePath = path.join(this.uploadsDir, filename);
      const stats = await fs.promises.stat(filePath);
      if (!stats.isFile()) throw new NotFoundException();

      const mimeType = lookup(filePath) || 'application/octet-stream';

      res.setHeader('Content-Type', mimeType as string);
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

      // Ensure the filename used in headers cannot inject XSS (strip quotes).
      const safeName = filename.replace(/"/g, '');
      res.setHeader('Content-Disposition', `inline; filename="${safeName}"`);

      const stream = fs.createReadStream(filePath);
      stream.on('error', () => {
        throw new NotFoundException();
      });

      stream.pipe(res);
    } catch (err) {
      throw new NotFoundException();
    }
  }
}
