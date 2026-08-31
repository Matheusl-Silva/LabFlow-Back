import { IsNotEmpty, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';
import { IsSchema } from '../validators/exam-template.decorators';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateExamTemplateDto {
  @ApiProperty({
    description: 'Nome do template',
    example: 'Hematologia',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @ApiProperty({
    description: 'Objeto descrevendo a estrutura do template',
    example: {
      Hemácia: {
        references: {
          Masculino: '4,3 - 5,7 milhões/µL',
          Feminino: '3,9 - 5,0 milhões/µL',
        },
      },
      Hemoglobina: {
        references: {
          Masculino: '13,5 - 17,5 g/dL',
          Feminino: '12,0 - 15,5 g/dL',
        },
      },
    },
  })
  @IsSchema()
  schema!: object;

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

  @ApiProperty({
    description: 'Versão do template',
    example: 1,
    default: 1,
  })
  @IsInt()
  version?: number = 1;
}
