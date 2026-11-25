import {
  Controller,
  Get,
  Post,
  Patch,
  Query,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Inject,
} from '@nestjs/common';
import { AdminService } from './admin.service.js';
import { JwtAuthGuard, RolesGuard } from '../../common/guards.js';
import { Roles, CurrentUser, RequestUser } from '../../common/decorators.js';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(@Inject(AdminService) private readonly admin: AdminService) {}

  @Get('stats')
  stats() {
    return this.admin.stats();
  }

  @Get('users')
  list(@Query() q: Record<string, string>) {
    return this.admin.listUsers(q);
  }

  @Post('users')
  create(@Body() body: unknown) {
    return this.admin.createUser(body);
  }

  @Patch('users/:id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
    @CurrentUser() user: RequestUser,
  ) {
    return this.admin.updateUser(id, body, user.id);
  }
}
