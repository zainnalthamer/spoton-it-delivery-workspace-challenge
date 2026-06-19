import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import type { RequestUser } from '../common/request-user';
import { ItWorkspaceService } from './it-workspace.service';
import { CreateWorkItemDto } from './dto/create-work-item.dto';
import { UpdateWorkItemDto } from './dto/update-work-item.dto';
import { QueryWorkItemsDto } from './dto/query-work-items.dto';

@UseGuards(JwtAuthGuard)
@Controller('it-workspace')
export class ItWorkspaceController {
  constructor(private readonly workspace: ItWorkspaceService) {}

  @Get('summary')
  summary() {
    return this.workspace.summary();
  }

  @Post('work-items')
  createWorkItem(@Body() dto: CreateWorkItemDto, @CurrentUser() user: RequestUser) {
    return this.workspace.createWorkItem(dto, user.name);
  }

  @Get('work-items')
  listWorkItems(@Query() query: QueryWorkItemsDto, @CurrentUser() user: RequestUser) {
    return this.workspace.listWorkItems(query, user.name);
  }

  @Get('work-items/:id')
  getWorkItem(@Param('id') id: string) {
    return this.workspace.getWorkItem(id);
  }

  @Patch('work-items/:id')
  updateWorkItem(@Param('id') id: string, @Body() dto: UpdateWorkItemDto) {
    return this.workspace.updateWorkItem(id, dto);
  }

  @Delete('work-items/:id')
  deleteWorkItem(@Param('id') id: string) {
    return this.workspace.deleteWorkItem(id);
  }
}