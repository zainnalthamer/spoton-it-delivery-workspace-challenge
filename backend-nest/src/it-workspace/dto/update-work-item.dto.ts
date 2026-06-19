import { PartialType } from '@nestjs/mapped-types';
import { IsIn, IsOptional } from 'class-validator';
import { CreateWorkItemDto } from './create-work-item.dto';

const STATUSES = ['backlog', 'planned', 'in_progress', 'qa', 'ready_for_release', 'released'] as const;

export class UpdateWorkItemDto extends PartialType(CreateWorkItemDto) {
  @IsOptional()
  @IsIn(STATUSES)
  status?: (typeof STATUSES)[number];
}