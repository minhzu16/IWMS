import { Module } from '@nestjs/common';
import { CountsService } from './counts.service.js';
import { CountsController } from './counts.controller.js';
import { InventoryModule } from '../inventory/inventory.module.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [InventoryModule, AuthModule],
  providers: [CountsService],
  controllers: [CountsController],
  exports: [CountsService],
})
export class CountsModule {}
