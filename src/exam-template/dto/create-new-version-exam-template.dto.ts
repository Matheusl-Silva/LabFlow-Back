import { IsSchema } from '../validators/exam-template.decorators';
import { ApiProperty } from '@nestjs/swagger';

export class CreateNewVersionExamTemplateDto {
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
}
