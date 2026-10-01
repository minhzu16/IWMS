import { Module } from '@nestjs/common';
import { InventoryService } from './inventory.service.js';
import { StockPostingService } from './stock-posting.service.js';
import { InventoryController } from './inventory.controller.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [AuthModule],
  providers: [InventoryService, StockPostingService],
  controllers: [InventoryController],
  exports: [InventoryService, StockPostingService],
})
export class InventoryModule {}
