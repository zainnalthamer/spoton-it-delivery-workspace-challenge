import { IsDateString, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export const TYPES = ['feature', 'bug', 'improvement', 'maintenance'] as const;
export const PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
export const STATUSES = ['backlog', 'in_progress', 'done', 'blocked'] as const;

export class CreateWorkItemDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsIn(TYPES)
  type!: (typeof TYPES)[number];

  @IsIn(PRIORITIES)
  priority!: (typeof PRIORITIES)[number];

  @IsOptional()
  @IsString()
  assignee?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}