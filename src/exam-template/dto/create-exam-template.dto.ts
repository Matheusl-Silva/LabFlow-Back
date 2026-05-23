import { IsNotEmpty, IsString } from '@nestjs/class-validator';
import { IsSchema } from '../validators/exam-template.decorators';

export class CreateExamTemplateDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsSchema()
  schema!: object;
}
