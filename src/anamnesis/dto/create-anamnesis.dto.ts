import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from '@nestjs/class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAnamnesisDto {
  @ApiProperty({
    description: 'Queixa principal do paciente',
    example: 'Dor de cabeça persistente há 3 dias',
  })
  @IsString()
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
  @IsNotEmpty()
  frequency!: string;

  @ApiProperty({
    description: 'Localização da dor',
    example: 'Região frontal da cabeça',
  })
  @IsString()
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
  @IsOptional()
  otherDiseases?: string;

  @ApiPropertyOptional({
    description: 'Alergias do paciente',
    example: 'Penicilina',
  })
  @IsString()
  @IsOptional()
  allergies?: string;

  @ApiPropertyOptional({
    description: 'Medicamentos em uso pelo paciente',
    example: 'Losartana 50mg',
  })
  @IsString()
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
  @IsNotEmpty()
  urinaryElimination!: string;

  @ApiProperty({
    description: 'Descrição da eliminação intestinal',
    example: 'Regular',
  })
  @IsString()
  @IsNotEmpty()
  intestinalElimination!: string;

  @ApiPropertyOptional({
    description: 'Descrição do ciclo menstrual, se aplicável',
    example: 'Regular, 28 dias',
  })
  @IsString()
  @IsOptional()
  menstrualCycle?: string;

  @ApiProperty({
    description: 'Descrição do sono e repouso',
    example: 'Sono tranquilo',
  })
  @IsString()
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
  @IsOptional()
  smokingFrequency?: string;

  @ApiPropertyOptional({
    description: 'Frequência de uso de drogas',
    example: 'Não usa',
  })
  @IsString()
  @IsOptional()
  drugsFrequency?: string;

  @ApiPropertyOptional({
    description: 'Frequência de consumo de álcool',
    example: 'Socialmente',
  })
  @IsString()
  @IsOptional()
  alcoholFrequency?: string;

  @ApiPropertyOptional({
    description: 'Frequência de prática de exercícios físicos',
    example: '3 vezes por semana',
  })
  @IsString()
  @IsOptional()
  exerciseFrequency?: string;

  @ApiPropertyOptional({
    description: 'Atividades de lazer do paciente',
    example: 'Leitura e caminhadas',
  })
  @IsString()
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
  @IsOptional()
  familyDisease?: string;

  @ApiPropertyOptional({
    description: 'Tratamento da doença familiar',
    example: 'Uso contínuo de insulina',
  })
  @IsString()
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
