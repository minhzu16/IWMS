import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { SalesService } from './sales.service.js';
import { JwtAuthGuard, RolesGuard } from '../../common/guards.js';
import { Roles, CurrentUser, RequestUser } from '../../common/decorators.js';
import { SOCreateSchema } from '@iwms/shared';

@Controller('sales-orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SalesController {
  constructor(private salesService: SalesService) {}

  @Get()
  async getSOs(
    @Query('status') status?: string,
    @Query('warehouseId') warehouseId?: string,
  ) {
    return this.salesService.getSOs({
      status,
      warehouseId: warehouseId ? parseInt(warehouseId, 10) : undefined,
    });
  }

  @Get(':id')
  async getSOById(@Param('id', ParseIntPipe) id: number) {
    return this.salesService.getSOById(id);
  }

  @Post()
  @Roles('ADMIN', 'MANAGER', 'SALES')
  async createSO(@Body() body: unknown, @CurrentUser() user: RequestUser) {
    const validated = SOCreateSchema.parse(body);
    return this.salesService.createSO(validated, user.id);
  }

  @Post(':id/confirm')
  @Roles('ADMIN', 'MANAGER', 'SALES')
  async confirmSO(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.salesService.confirmSO(id, user.id);
  }

  @Post(':id/ship')
  @Roles('ADMIN', 'MANAGER', 'WAREHOUSE')
  async shipSO(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.salesService.shipSO(id, user.id);
  }

  @Post(':id/cancel')
  @Roles('ADMIN', 'MANAGER', 'SALES')
  async cancelSO(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.salesService.cancelSO(id, user.id);
  }
}
