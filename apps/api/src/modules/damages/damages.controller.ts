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
import { DamagesService } from './damages.service.js';
import { JwtAuthGuard, RolesGuard } from '../../common/guards.js';
import { Roles, CurrentUser, RequestUser } from '../../common/decorators.js';
import { DamageReportCreateSchema } from '@iwms/shared';

@Controller('damage-reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DamagesController {
  constructor(private damagesService: DamagesService) {}

  @Get()
  async getReports(@Query('warehouseId') warehouseId?: string) {
    return this.damagesService.getReports(warehouseId ? parseInt(warehouseId, 10) : undefined);
  }

  @Get(':id')
  async getReportById(@Param('id', ParseIntPipe) id: number) {
    return this.damagesService.getReportById(id);
  }

  @Post()
  @Roles('ADMIN', 'MANAGER', 'WAREHOUSE')
  async createReport(@Body() body: unknown, @CurrentUser() user: RequestUser) {
    const validated = DamageReportCreateSchema.parse(body);
    return this.damagesService.createReport(validated, user.id);
  }

  @Post(':id/approve')
  @Roles('ADMIN', 'MANAGER')
  async approveReport(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.damagesService.approveReport(id, user.id);
  }
}
