import { Module } from '@nestjs/common';
import { SalesService } from './sales.service.js';
import { SalesController } from './sales.controller.js';
import { InventoryModule } from '../inventory/inventory.module.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [InventoryModule, AuthModule],
  providers: [SalesService],
  controllers: [SalesController],
  exports: [SalesService],
})
export class SalesModule {}
