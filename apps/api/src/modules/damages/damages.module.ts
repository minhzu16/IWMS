import { Module } from '@nestjs/common';
import { DamagesService } from './damages.service.js';
import { DamagesController } from './damages.controller.js';
import { InventoryModule } from '../inventory/inventory.module.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [InventoryModule, AuthModule],
  providers: [DamagesService],
  controllers: [DamagesController],
  exports: [DamagesService],
})
export class DamagesModule {}
