import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateAnamnesisDto } from './create-anamnesis.dto';

// `patientId` é omitido: uma anamnese não pode ser movida de paciente via update
// (mesmo padrão do UpdateExamDto).
export class UpdateAnamnesisDto extends PartialType(
  OmitType(CreateAnamnesisDto, ['patientId'] as const),
) {}
