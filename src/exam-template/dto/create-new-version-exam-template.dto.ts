import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { IsSchema } from '../validators/exam-template.decorators';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateNewVersionExamTemplateDto {
  @ApiPropertyOptional({
    description:
      'Novo nome do template. Quando presente, a nova versão nasce com este ' +
      'nome (permite renomear e alterar os campos numa única operação). ' +
      'Ausente, a nova versão herda o nome da versão atual.',
    example: 'Hematologia',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @IsOptional()
  name?: string;

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
}
