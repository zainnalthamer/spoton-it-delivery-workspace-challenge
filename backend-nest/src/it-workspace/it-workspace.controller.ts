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
import { CreateQaCheckDto } from './dto/create-qa-check.dto';
import { UpdateQaCheckDto } from './dto/update-qa-check.dto';
import { CreateReleaseDto } from './dto/create-release.dto';
import { UpdateReleaseDto } from './dto/update-release.dto';

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
  return this.workspace.createWorkItem(dto, user);
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
updateWorkItem(
  @Param('id') id: string,
  @Body() dto: UpdateWorkItemDto,
  @CurrentUser() user: RequestUser,
) {
  return this.workspace.updateWorkItem(id, dto, user);
}

  @Get('work-items/:id/history')
  getWorkItemHistory(@Param('id') id: string) {
    return this.workspace.getWorkItemHistory(id);
  }

  @Delete('work-items/:id')
  deleteWorkItem(@Param('id') id: string) {
    return this.workspace.deleteWorkItem(id);
  }

  @Post('work-items/:id/qa-checks')
createQaCheck(@Param('id') id: string, @Body() dto: CreateQaCheckDto) {
  return this.workspace.createQaCheck(id, dto);
}

@Get('work-items/:id/qa-checks')
listQaChecks(@Param('id') id: string) {
  return this.workspace.listQaChecks(id);
}

@Patch('qa-checks/:id')
updateQaCheck(
  @Param('id') id: string,
  @Body() dto: UpdateQaCheckDto,
  @CurrentUser() user: RequestUser,
) {
  return this.workspace.updateQaCheck(id, dto, user);
}

@Delete('qa-checks/:id')
deleteQaCheck(@Param('id') id: string) {
  return this.workspace.deleteQaCheck(id);
}

@Post('releases')
createRelease(@Body() dto: CreateReleaseDto) {
  return this.workspace.createRelease(dto);
}

@Get('releases')
listReleases() {
  return this.workspace.listReleases();
}

@Get('releases/:id')
getRelease(@Param('id') id: string) {
  return this.workspace.getRelease(id);
}

@Patch('releases/:id')
updateRelease(@Param('id') id: string, @Body() dto: UpdateReleaseDto) {
  return this.workspace.updateRelease(id, dto);
}

@Post('releases/:id/link/:workItemId')
linkWorkItem(@Param('id') id: string, @Param('workItemId') workItemId: string) {
  return this.workspace.linkWorkItem(id, workItemId);
}

@Delete('releases/:id/link/:workItemId')
unlinkWorkItem(@Param('id') id: string, @Param('workItemId') workItemId: string) {
  return this.workspace.unlinkWorkItem(id, workItemId);
}

@Post('releases/:id/deploy')
deployRelease(@Param('id') id: string, @CurrentUser() user: RequestUser) {
  return this.workspace.deployRelease(id, user);
}
}