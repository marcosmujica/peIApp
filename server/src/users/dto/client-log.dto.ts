import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ClientLogDto {
  @IsString()
  @IsNotEmpty()
  message: string;

  @IsString()
  @IsOptional()
  level?: string;

  @IsString()
  @IsOptional()
  context?: string;

  @IsString()
  @IsOptional()
  platform?: string;
}
