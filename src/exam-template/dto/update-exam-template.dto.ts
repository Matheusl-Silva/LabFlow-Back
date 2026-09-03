import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
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

  @ApiPropertyOptional({
    description:
      'Material biológico analisado. Fixo por tipo de exame, por isso fica no ' +
      'modelo: todo laudo gerado a partir dele já sai com este valor.',
    example: 'Sangue total (EDTA)',
  })
  @IsString()
  @MaxLength(120)
  @IsOptional()
  material?: string | null;

  @ApiPropertyOptional({
    description: 'Método/técnica usada na análise. Também fixo por tipo de exame.',
    example: 'Citometria de fluxo',
  })
  @IsString()
  @MaxLength(120)
  @IsOptional()
  method?: string | null;
}
