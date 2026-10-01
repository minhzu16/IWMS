import { Module } from '@nestjs/common';
import { TransfersService } from './transfers.service.js';
import { TransfersController } from './transfers.controller.js';
import { InventoryModule } from '../inventory/inventory.module.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [InventoryModule, AuthModule],
  providers: [TransfersService],
  controllers: [TransfersController],
  exports: [TransfersService],
})
export class TransfersModule {}
