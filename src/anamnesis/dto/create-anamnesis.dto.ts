import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAnamnesisDto {
  @ApiProperty({
    description: 'Queixa principal do paciente',
    example: 'Dor de cabeça persistente há 3 dias',
  })
  @IsString()
  @MaxLength(250)
  @IsNotEmpty()
  chiefComplaint!: string;

  @ApiProperty({
    description: 'Data e hora de início dos sintomas (formato ISO 8601)',
    example: '2026-01-01T12:00',
  })
  @IsDateString()
  @IsNotEmpty()
  symptomsOnset!: Date;

  @ApiProperty({
    description: 'Frequência com que os sintomas ocorrem',
    example: 'Diária',
  })
  @IsString()
  @MaxLength(250)
  @IsNotEmpty()
  frequency!: string;

  @ApiProperty({
    description: 'Localização da dor',
    example: 'Região frontal da cabeça',
  })
  @IsString()
  @MaxLength(250)
  @IsNotEmpty()
  painLocation!: string;

  @ApiProperty({
    description: 'Possui cardiopatia',
    example: false,
  })
  @IsBoolean()
  heartDisease!: boolean;

  @ApiProperty({
    description: 'Possui hipertensão',
    example: false,
  })
  @IsBoolean()
  hypertension!: boolean;

  @ApiProperty({
    description: 'Possui diabetes',
    example: false,
  })
  @IsBoolean()
  diabetes!: boolean;

  @ApiProperty({
    description: 'Possui câncer',
    example: false,
  })
  @IsBoolean()
  cancer!: boolean;

  @ApiProperty({
    description: 'Já realizou cirurgias',
    example: false,
  })
  @IsBoolean()
  surgeries!: boolean;

  @ApiPropertyOptional({
    description: 'Outras doenças relatadas pelo paciente',
    example: 'Asma',
  })
  @IsString()
  @MaxLength(250)
  @IsOptional()
  otherDiseases?: string;

  @ApiPropertyOptional({
    description: 'Alergias do paciente',
    example: 'Penicilina',
  })
  @IsString()
  @MaxLength(250)
  @IsOptional()
  allergies?: string;

  @ApiPropertyOptional({
    description: 'Medicamentos em uso pelo paciente',
    example: 'Losartana 50mg',
  })
  @IsString()
  @MaxLength(250)
  @IsOptional()
  medication?: string;

  @ApiProperty({
    description: 'Número de refeições por dia',
    example: 3,
  })
  @IsInt()
  mealsPerDay!: number;

  @ApiProperty({
    description: 'Descrição da eliminação urinária',
    example: 'Normal',
  })
  @IsString()
  @MaxLength(250)
  @IsNotEmpty()
  urinaryElimination!: string;

  @ApiProperty({
    description: 'Descrição da eliminação intestinal',
    example: 'Regular',
  })
  @IsString()
  @MaxLength(250)
  @IsNotEmpty()
  intestinalElimination!: string;

  @ApiPropertyOptional({
    description: 'Descrição do ciclo menstrual, se aplicável',
    example: 'Regular, 28 dias',
  })
  @IsString()
  @MaxLength(250)
  @IsOptional()
  menstrualCycle?: string;

  @ApiProperty({
    description: 'Descrição do sono e repouso',
    example: 'Sono tranquilo',
  })
  @IsString()
  @MaxLength(250)
  @IsNotEmpty()
  sleepAndRest!: string;

  @ApiProperty({
    description: 'Número de horas de sono por dia',
    example: 8,
  })
  @IsInt()
  sleepHours!: number;

  @ApiPropertyOptional({
    description: 'Frequência de uso de fumo',
    example: 'Não fuma',
  })
  @IsString()
  @MaxLength(250)
  @IsOptional()
  smokingFrequency?: string;

  @ApiPropertyOptional({
    description: 'Frequência de uso de drogas',
    example: 'Não usa',
  })
  @IsString()
  @MaxLength(250)
  @IsOptional()
  drugsFrequency?: string;

  @ApiPropertyOptional({
    description: 'Frequência de consumo de álcool',
    example: 'Socialmente',
  })
  @IsString()
  @MaxLength(250)
  @IsOptional()
  alcoholFrequency?: string;

  @ApiPropertyOptional({
    description: 'Frequência de prática de exercícios físicos',
    example: '3 vezes por semana',
  })
  @IsString()
  @MaxLength(250)
  @IsOptional()
  exerciseFrequency?: string;

  @ApiPropertyOptional({
    description: 'Atividades de lazer do paciente',
    example: 'Leitura e caminhadas',
  })
  @IsString()
  @MaxLength(250)
  @IsOptional()
  leisure?: string;

  @ApiProperty({
    description: 'Possui saneamento básico na residência',
    example: true,
  })
  @IsBoolean()
  basicSanitation!: boolean;

  @ApiPropertyOptional({
    description: 'Animais domésticos na residência',
    example: 'Cão e gato',
  })
  @IsString()
  @MaxLength(250)
  @IsOptional()
  domesticAnimals?: string;

  @ApiProperty({
    description: 'Possui posto de saúde próximo à residência',
    example: true,
  })
  @IsBoolean()
  healthCenter!: boolean;

  @ApiPropertyOptional({
    description: 'Doença presente no histórico familiar',
    example: 'Diabetes',
  })
  @IsString()
  @MaxLength(250)
  @IsOptional()
  familyDisease?: string;

  @ApiPropertyOptional({
    description: 'Tratamento da doença familiar',
    example: 'Uso contínuo de insulina',
  })
  @IsString()
  @MaxLength(250)
  @IsOptional()
  familyDiseaseTreatment?: string;

  @ApiProperty({
    description: 'ID do paciente ao qual a anamnese pertence',
    example: 1,
  })
  @IsInt()
  patientId!: number;

  @ApiProperty({
    description: 'Data de realização da anamnese (formato ISO 8601)',
    example: '2026-01-01T12:00',
  })
  @IsDateString()
  @IsNotEmpty()
  date!: Date;
}
