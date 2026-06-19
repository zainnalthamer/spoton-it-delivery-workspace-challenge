import { IsIn, IsOptional, IsString } from 'class-validator';

const STATUSES = ['backlog', 'planned', 'in_progress', 'qa', 'ready_for_release', 'released'] as const;
const PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;

export class QueryWorkItemsDto {
  @IsOptional()
  @IsIn(STATUSES)
  status?: string;

  @IsOptional()
  @IsIn(PRIORITIES)
  priority?: string;

  @IsOptional()
  @IsString()
  assignee?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  mine?: string; 
}