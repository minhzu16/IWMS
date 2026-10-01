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
import { CountsService } from './counts.service.js';
import { JwtAuthGuard, RolesGuard } from '../../common/guards.js';
import { Roles, CurrentUser, RequestUser } from '../../common/decorators.js';
import { StockCountCreateSchema } from '@iwms/shared';

@Controller('stock-counts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CountsController {
  constructor(private countsService: CountsService) {}

  @Get()
  async getCounts(@Query('warehouseId') warehouseId?: string) {
    return this.countsService.getCounts(warehouseId ? parseInt(warehouseId, 10) : undefined);
  }

  @Get(':id')
  async getCountById(@Param('id', ParseIntPipe) id: number) {
    return this.countsService.getCountById(id);
  }

  @Post()
  @Roles('ADMIN', 'MANAGER', 'WAREHOUSE')
  async createCount(@Body() body: unknown, @CurrentUser() user: RequestUser) {
    const validated = StockCountCreateSchema.parse(body);
    return this.countsService.createCount(validated, user.id);
  }

  @Post(':id/approve')
  @Roles('ADMIN', 'MANAGER')
  async approveCount(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.countsService.approveCount(id, user.id);
  }
}
