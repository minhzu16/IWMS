import { Module } from '@nestjs/common';
import { PurchasingService } from './purchasing.service.js';
import { PurchasingController } from './purchasing.controller.js';
import { InventoryModule } from '../inventory/inventory.module.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [InventoryModule, AuthModule],
  providers: [PurchasingService],
  controllers: [PurchasingController],
  exports: [PurchasingService],
})
export class PurchasingModule {}
