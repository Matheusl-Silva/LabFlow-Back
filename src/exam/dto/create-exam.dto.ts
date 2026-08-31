import { IsDateString, IsInt, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateExamDto {
  @ApiProperty({
    description: 'ID do template usado pelo exame',
    example: 1
  })
  @IsInt()
  examTemplateId!: number;

  @ApiProperty({
    description: 'ID do paciente que realizou o exame',
    example: 1
  })
  @IsInt()
  patientId!: number;

  @ApiProperty({
    description: 'ID do preceptor do exame',
    example: 1
  })
  @IsInt()
  preceptorId!: number;

  @ApiProperty({
    description: 'ID do responsável pelo exame',
    example: 1
  })
  @IsInt()
  responsibleId!: number;

  @ApiProperty({
    description: 'Data do exame',
    example: '2026-01-01T12:00',
  })
  @IsDateString()
  date!: Date;

  @ApiProperty({
    description: 'Dados do exame no formato do template usado',
    example: {
      Hemácia: 4.1,
      Hemoglobina: 12.2
    }
  })
  @IsObject()
  data!: object;

  @ApiPropertyOptional({
    description:
      'Observação do laudo (particularidades deste resultado, como amostra ' +
      'hemolisada ou jejum irregular). Material e método NÃO entram aqui: são ' +
      'do modelo de exame.',
    example: 'Amostra levemente hemolisada.',
  })
  @IsString()
  @MaxLength(1000)
  @IsOptional()
  observation?: string | null;
}
