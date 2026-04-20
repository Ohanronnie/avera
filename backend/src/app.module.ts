import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { MailerModule } from './mailer/mailer.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { UsersModule } from './users/users.module';
import { LoggerModule } from './logger/logger.module';
import { CategoriesModule } from './categories/categories.module';
import { ProductsModule } from './products/products.module';
import { MulterModule } from '@nestjs/platform-express';
import { UploadsModule } from './uploads/uploads.module';
import { MediaModule } from './media/media.module';
@Module({
  imports: [
    LoggerModule,
    EventEmitterModule.forRoot(),
    AuthModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    RedisModule,
    MailerModule,
    UsersModule,
    LoggerModule,
    CategoriesModule,
    ProductsModule,

    UploadsModule,

    MediaModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
