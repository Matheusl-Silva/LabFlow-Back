import { PartialType } from '@nestjs/swagger';
import { CreateAnamnesisDto } from './create-anamnesis.dto';

export class UpdateAnamnesisDto extends PartialType(CreateAnamnesisDto) {}
