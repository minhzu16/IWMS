import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { ProblemDetailsFilter } from './common/problem-details.filter.js';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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
}

bootstrap().catch((err) => {
  console.error('[IWMS Backend] Bootstrap error:', err);
  process.exit(1);
});
