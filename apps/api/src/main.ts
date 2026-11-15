import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { ProblemDetailsFilter } from './common/problem-details.filter.js';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { pool } from '@iwms/db';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Resilient process lifecycle (NestJS shutdown hooks + connection draining)
  app.enableShutdownHooks();

  app.use(helmet());
  app.setGlobalPrefix('api/v1');

  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  });

  app.use(cookieParser());
  app.useGlobalFilters(new ProblemDetailsFilter());

  // Swagger Documentation Setup
  const config = new DocumentBuilder()
    .setTitle('IWMS - Inventory & Warehouse Management API')
    .setDescription(
      'Hệ thống quản trị kho & tồn kho theo mô hình Sổ Cái (Ledger-First), kiểm soát giao dịch đồng thời và truy vết toàn diện.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`[IWMS Backend] Server is running on: http://localhost:${port}/api/v1`);
  console.log(`[IWMS Backend] Swagger API docs: http://localhost:${port}/docs`);

  const gracefulShutdown = async (signal: string) => {
    console.log(`[IWMS Backend] Received ${signal}. Draining connections and shutting down cleanly...`);
    try {
      await app.close();
      await pool.end();
      console.log('[IWMS Backend] HTTP server closed and PostgreSQL pool drained cleanly.');
      process.exit(0);
    } catch (err) {
      console.error('[IWMS Backend] Error during graceful shutdown:', err);
      process.exit(1);
    }
  };

  process.once('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.once('SIGINT', () => gracefulShutdown('SIGINT'));
}

bootstrap().catch((err) => {
  console.error('[IWMS Backend] Bootstrap error:', err);
  process.exit(1);
});
