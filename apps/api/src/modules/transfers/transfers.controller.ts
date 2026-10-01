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
import { TransfersService } from './transfers.service.js';
import { JwtAuthGuard, RolesGuard } from '../../common/guards.js';
import { Roles, CurrentUser, RequestUser } from '../../common/decorators.js';
import { TransferCreateSchema, TransferReceiveSchema } from '@iwms/shared';

@Controller('transfers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TransfersController {
  constructor(private transfersService: TransfersService) {}

  @Get()
  async getTransfers(
    @Query('status') status?: string,
    @Query('warehouseId') warehouseId?: string,
  ) {
    return this.transfersService.getTransfers({
      status,
      warehouseId: warehouseId ? parseInt(warehouseId, 10) : undefined,
    });
  }

  @Get(':id')
  async getTransferById(@Param('id', ParseIntPipe) id: number) {
    return this.transfersService.getTransferById(id);
  }

  @Post()
  @Roles('ADMIN', 'MANAGER', 'WAREHOUSE')
  async createTransfer(@Body() body: unknown, @CurrentUser() user: RequestUser) {
    const validated = TransferCreateSchema.parse(body);
    return this.transfersService.createTransfer(validated, user.id);
  }

  @Post(':id/dispatch')
  @Roles('ADMIN', 'MANAGER', 'WAREHOUSE')
  async dispatchTransfer(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.transfersService.dispatchTransfer(id, user.id);
  }

  @Post(':id/receive')
  @Roles('ADMIN', 'MANAGER', 'WAREHOUSE')
  async receiveTransfer(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
    @CurrentUser() user: RequestUser,
  ) {
    const validated = TransferReceiveSchema.parse(body);
    return this.transfersService.receiveTransfer(id, validated, user.id);
  }
}
