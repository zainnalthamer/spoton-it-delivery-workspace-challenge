import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateQaCheckDto {
  @IsString()
  @IsNotEmpty()
  testTitle!: string;

  @IsString()
  @IsNotEmpty()
  expectedResult!: string;

  @IsOptional()
  @IsString()
  tester?: string;
}