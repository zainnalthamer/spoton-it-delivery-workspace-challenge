import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateReleaseDto {
  @IsString()
  @IsNotEmpty()
  version!: string;

  @IsOptional()
  @IsDateString()
  releaseDate?: string;

  @IsOptional()
  @IsString()
  summary?: string;
}