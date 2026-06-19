import { IsIn, IsOptional, IsString } from 'class-validator';

const STATUSES = ['pending', 'passed', 'failed'] as const;

export class UpdateQaCheckDto {
  @IsOptional()
  @IsString()
  testTitle?: string;

  @IsOptional()
  @IsString()
  expectedResult?: string;

  @IsOptional()
  @IsString()
  actualResult?: string;

  @IsOptional()
  @IsIn(STATUSES)
  status?: (typeof STATUSES)[number];

  @IsOptional()
  @IsString()
  tester?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}