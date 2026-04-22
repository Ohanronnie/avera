import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Injectable, InternalServerErrorException } from '@nestjs/common';

@Injectable()
export class R2StorageService {
  private readonly bucketName = process.env.R2_BUCKET_NAME;
  private readonly publicBaseUrl =
    process.env.R2_SUBDOMAIN_URL || process.env.r2_subdomain_url;
  private readonly client = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT_URL,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    },
    forcePathStyle: true,
  });

  private assertConfigured() {
    if (
      !process.env.R2_ENDPOINT_URL ||
      !process.env.R2_ACCESS_KEY_ID ||
      !process.env.R2_SECRET_ACCESS_KEY ||
      !this.bucketName ||
      !this.publicBaseUrl
    ) {
      throw new InternalServerErrorException('R2 storage is not configured');
    }
  }

  private getPublicUrl(key: string) {
    const baseUrl = this.publicBaseUrl!.replace(/\/+$/, '');
    return `${baseUrl}/${encodeURIComponent(key)}`;
  }

  async uploadImage(input: {
    key: string;
    buffer: Buffer;
    contentType: string;
  }) {
    this.assertConfigured();

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: input.key,
        Body: input.buffer,
        ContentType: input.contentType,
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );

    return this.getPublicUrl(input.key);
  }
}
