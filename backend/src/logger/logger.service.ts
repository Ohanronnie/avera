import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  Logger,
} from '@nestjs/common';
import { catchError, tap } from 'rxjs/operators';
import { Observable, throwError } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const { method, url } = req;
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        const res = context.switchToHttp().getResponse();
        const { statusCode } = res;
        const duration = Date.now() - start;
        this.logger.log(`${method} ${url} -> ${statusCode} [${duration}ms]`);
      }),
      catchError((err) => {
        const res = context.switchToHttp().getResponse();
        const statusCode = err.status || res.statusCode || 500;
        const duration = Date.now() - start;
        this.logger.error(
          `${method} ${url} -> ${statusCode} [${duration}ms] Error: ${err.message}`,
        );
        return throwError(() => err);
      }),
    );
  }
}
