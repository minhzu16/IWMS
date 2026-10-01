import { Module } from '@nestjs/common';
import { OpsController } from './ops.controller.js';
import { InventoryModule } from '../inventory/inventory.module.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [InventoryModule, AuthModule],
  controllers: [OpsController],
})
export class OpsModule {}
