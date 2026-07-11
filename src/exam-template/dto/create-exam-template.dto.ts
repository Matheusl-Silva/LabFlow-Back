import { IsNotEmpty, IsInt, IsString } from '@nestjs/class-validator';
import { IsSchema } from '../validators/exam-template.decorators';
import { ApiProperty } from '@nestjs/swagger';

export class CreateExamTemplateDto {
  @ApiProperty({
    description: 'Nome do template',
    example: 'Hematologia',
  })
  @IsString()
  @IsNotEmpty()
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

  @ApiProperty({
    description: 'Versão do template',
    example: 1,
    default: 1,
  })
  @IsInt()
  version?: number = 1;
}
