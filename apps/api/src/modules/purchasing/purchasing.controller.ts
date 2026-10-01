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
import { PurchasingService } from './purchasing.service.js';
import { JwtAuthGuard, RolesGuard } from '../../common/guards.js';
import { Roles, CurrentUser, RequestUser } from '../../common/decorators.js';
import { POCreateSchema, GoodsReceiptCreateSchema } from '@iwms/shared';

@Controller('purchase-orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PurchasingController {
  constructor(private purchasingService: PurchasingService) {}

  @Get()
  async getPOs(
    @Query('status') status?: string,
    @Query('supplierId') supplierId?: string,
    @Query('warehouseId') warehouseId?: string,
  ) {
    return this.purchasingService.getPOs({
      status,
      supplierId: supplierId ? parseInt(supplierId, 10) : undefined,
      warehouseId: warehouseId ? parseInt(warehouseId, 10) : undefined,
    });
  }

  @Get(':id')
  async getPOById(@Param('id', ParseIntPipe) id: number) {
    return this.purchasingService.getPOById(id);
  }

  @Post()
  @Roles('ADMIN', 'MANAGER', 'PURCHASING')
  async createPO(@Body() body: unknown, @CurrentUser() user: RequestUser) {
    const validated = POCreateSchema.parse(body);
    return this.purchasingService.createPO(validated, user.id);
  }

  @Post(':id/submit')
  @Roles('ADMIN', 'MANAGER', 'PURCHASING')
  async submitPO(
    @Param('id', ParseIntPipe) id: number,
    @Body('version') version: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.purchasingService.transitionPO(id, 'SUBMIT', user.id, user.role, version);
  }

  @Post(':id/approve')
  @Roles('ADMIN', 'MANAGER')
  async approvePO(
    @Param('id', ParseIntPipe) id: number,
    @Body('version') version: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.purchasingService.transitionPO(id, 'APPROVE', user.id, user.role, version);
  }

  @Post(':id/reject')
  @Roles('ADMIN', 'MANAGER')
  async rejectPO(
    @Param('id', ParseIntPipe) id: number,
    @Body('version') version: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.purchasingService.transitionPO(id, 'REJECT', user.id, user.role, version);
  }

  @Post(':id/cancel')
  @Roles('ADMIN', 'MANAGER', 'PURCHASING')
  async cancelPO(
    @Param('id', ParseIntPipe) id: number,
    @Body('version') version: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.purchasingService.transitionPO(id, 'CANCEL', user.id, user.role, version);
  }

  @Post(':id/close')
  @Roles('ADMIN', 'MANAGER')
  async closePO(
    @Param('id', ParseIntPipe) id: number,
    @Body('version') version: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.purchasingService.transitionPO(id, 'CLOSE', user.id, user.role, version);
  }

  @Post(':id/receipts')
  @Roles('ADMIN', 'MANAGER', 'WAREHOUSE')
  async processReceipt(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
    @CurrentUser() user: RequestUser,
  ) {
    const validated = GoodsReceiptCreateSchema.parse(body);
    return this.purchasingService.processGoodsReceipt(id, validated, user.id);
  }
}
