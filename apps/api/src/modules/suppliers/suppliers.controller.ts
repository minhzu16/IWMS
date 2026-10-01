import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { SuppliersService } from './suppliers.service.js';
import { JwtAuthGuard, RolesGuard } from '../../common/guards.js';
import { Roles } from '../../common/decorators.js';
import { SupplierCreateSchema } from '@iwms/shared';

@Controller('suppliers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SuppliersController {
  constructor(private suppliersService: SuppliersService) {}

  @Get()
  async getSuppliers() {
    return this.suppliersService.getSuppliers();
  }

  @Get(':id')
  async getSupplierById(@Param('id', ParseIntPipe) id: number) {
    return this.suppliersService.getSupplierById(id);
  }

  @Get(':id/performance')
  async getSupplierPerformance(@Param('id', ParseIntPipe) id: number) {
    return this.suppliersService.getSupplierPerformance(id);
  }

  @Post()
  @Roles('ADMIN', 'MANAGER', 'PURCHASING')
  async createSupplier(@Body() body: unknown) {
    const validated = SupplierCreateSchema.parse(body);
    return this.suppliersService.createSupplier(validated);
  }

  @Patch(':id')
  @Roles('ADMIN', 'MANAGER', 'PURCHASING')
  async updateSupplier(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
  ) {
    const validated = SupplierCreateSchema.partial().parse(body);
    return this.suppliersService.updateSupplier(id, validated);
  }
}
