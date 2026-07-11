import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from '@nestjs/class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateExamTemplateDto {
  @ApiPropertyOptional({
    description: 'Nome do template',
    example: 'Hematologia',
  })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'Definição se o template está ativo ou não'
  })
  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @ApiPropertyOptional({
    description: 'Versão do template',
    example: 1,
    default: 1,
  })
  @IsInt()
  @IsOptional()
  version?: number;
}
