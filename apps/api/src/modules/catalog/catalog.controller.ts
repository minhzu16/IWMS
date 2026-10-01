import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { CatalogService } from './catalog.service.js';
import { JwtAuthGuard, RolesGuard } from '../../common/guards.js';
import { Roles } from '../../common/decorators.js';
import {
  ProductCreateSchema,
  ProductUpdateSchema,
  CategoryCreateSchema,
} from '@iwms/shared';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class CatalogController {
  constructor(private catalogService: CatalogService) {}

  // Categories
  @Get('categories')
  async getCategories() {
    return this.catalogService.getCategories();
  }

  @Post('categories')
  @Roles('ADMIN', 'MANAGER')
  async createCategory(@Body() body: unknown) {
    const validated = CategoryCreateSchema.parse(body);
    return this.catalogService.createCategory(validated);
  }

  // Products
  @Get('products')
  async getProducts(
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.catalogService.getProducts({
      search,
      categoryId: categoryId ? parseInt(categoryId, 10) : undefined,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
    });
  }

  @Get('products/by-barcode/:code')
  async getProductByBarcode(@Param('code') code: string) {
    return this.catalogService.getProductByBarcode(code);
  }

  @Get('products/:id')
  async getProductById(@Param('id', ParseIntPipe) id: number) {
    return this.catalogService.getProductById(id);
  }

  @Post('products')
  @Roles('ADMIN', 'MANAGER')
  async createProduct(@Body() body: unknown) {
    const validated = ProductCreateSchema.parse(body);
    return this.catalogService.createProduct(validated);
  }

  @Patch('products/:id')
  @Roles('ADMIN', 'MANAGER')
  async updateProduct(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
  ) {
    const validated = ProductUpdateSchema.parse(body);
    return this.catalogService.updateProduct(id, validated);
  }

  @Post('products/import')
  @Roles('ADMIN', 'MANAGER')
  async importProducts(@Body() body: { items: any[] }) {
    return this.catalogService.importProducts(body.items);
  }
}
