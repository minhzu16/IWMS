import { Module } from '@nestjs/common';
import { WarehousesService } from './warehouses.service.js';
import { WarehousesController } from './warehouses.controller.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [AuthModule],
  providers: [WarehousesService],
  controllers: [WarehousesController],
  exports: [WarehousesService],
})
export class WarehousesModule {}
