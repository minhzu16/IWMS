import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { AuthModule } from './modules/auth/auth.module.js';
import { CatalogModule } from './modules/catalog/catalog.module.js';
import { SuppliersModule } from './modules/suppliers/suppliers.module.js';
import { WarehousesModule } from './modules/warehouses/warehouses.module.js';
import { InventoryModule } from './modules/inventory/inventory.module.js';
import { PurchasingModule } from './modules/purchasing/purchasing.module.js';
import { SalesModule } from './modules/sales/sales.module.js';
import { TransfersModule } from './modules/transfers/transfers.module.js';
import { DamagesModule } from './modules/damages/damages.module.js';
import { CountsModule } from './modules/counts/counts.module.js';
import { ReportsModule } from './modules/reports/reports.module.js';
import { AuditModule } from './modules/audit/audit.module.js';
import { OpsModule } from './modules/ops/ops.module.js';
import { IdempotencyMiddleware } from './common/idempotency.middleware.js';

@Module({
  imports: [
    AuthModule,
    CatalogModule,
    SuppliersModule,
    WarehousesModule,
    InventoryModule,
    PurchasingModule,
    SalesModule,
    TransfersModule,
    DamagesModule,
    CountsModule,
    ReportsModule,
    AuditModule,
    OpsModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(IdempotencyMiddleware).forRoutes('*');
  }
}
