import './load-env';
import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { BookingRuleExceptionFilter } from './common/booking-rule.filter';
import { env } from './common/env';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
  app.useGlobalFilters(new BookingRuleExceptionFilter());
  // Mini-app gọi API qua rewrite cùng origin nên chỉ cần CORS cho đối tác tích hợp thẳng.
  app.enableCors({ origin: env.webUrl, credentials: true });
  await app.listen(env.port);
}
bootstrap();
