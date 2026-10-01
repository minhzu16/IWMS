import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Param,
  Body,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { WarehousesService } from './warehouses.service.js';
import { JwtAuthGuard, RolesGuard } from '../../common/guards.js';
import { Roles } from '../../common/decorators.js';
import {
  WarehouseCreateSchema,
  ProductWarehouseSettingSchema,
} from '@iwms/shared';

@Controller('warehouses')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WarehousesController {
  constructor(private warehousesService: WarehousesService) {}

  @Get()
  async getWarehouses() {
    return this.warehousesService.getWarehouses();
  }

  @Get(':id')
  async getWarehouseById(@Param('id', ParseIntPipe) id: number) {
    return this.warehousesService.getWarehouseById(id);
  }

  @Post()
  @Roles('ADMIN', 'MANAGER')
  async createWarehouse(@Body() body: unknown) {
    const validated = WarehouseCreateSchema.parse(body);
    return this.warehousesService.createWarehouse(validated);
  }

  @Patch(':id')
  @Roles('ADMIN', 'MANAGER')
  async updateWarehouse(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
  ) {
    const validated = WarehouseCreateSchema.partial().parse(body);
    return this.warehousesService.updateWarehouse(id, validated);
  }

  @Put(':id/settings/:productId')
  @Roles('ADMIN', 'MANAGER')
  async setProductSetting(
    @Param('id', ParseIntPipe) warehouseId: number,
    @Param('productId', ParseIntPipe) productId: number,
    @Body() body: unknown,
  ) {
    const validated = ProductWarehouseSettingSchema.parse(body);
    return this.warehousesService.setProductSetting(warehouseId, productId, validated);
  }
}
