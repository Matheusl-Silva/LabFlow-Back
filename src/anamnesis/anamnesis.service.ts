import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateAnamnesisDto } from './dto/create-anamnesis.dto';
import { UpdateAnamnesisDto } from './dto/update-anamnesis.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Anamnesis } from '../entities/anamnesis.entity';
import { Repository } from 'typeorm';

@Injectable()
export class AnamnesisService {
  constructor(@InjectRepository(Anamnesis) private readonly repo: Repository<Anamnesis>){}

  async create(dto: CreateAnamnesisDto): Promise<Anamnesis> {
    const anamnesis = await this.repo.create(dto);
    return await this.repo.save(anamnesis);
  }

  async getByPatientId(patientId: number): Promise<Anamnesis[]> {
    return await this.repo.find({
      where: {
        patientId
      }
    })
  }

  async getById(id: number): Promise<Anamnesis|null> {
    return await this.repo.findOneBy({id});
  }

  async update(id: number, dto: UpdateAnamnesisDto): Promise<boolean>{
    const anamnesis = await this.repo.findOneBy({id});
    if(!anamnesis) throw new NotFoundException('Anamnesis not found');

    const result = await this.repo.update(id, dto);
    return (result.affected ?? 0) > 0;
  }

  async delete(id: number): Promise<boolean> {
    // Soft delete: preserva o registro clínico (marca deleted_at) em vez de
    // apagar a linha.
    const result = await this.repo.softDelete(id);
    if(!result.affected) throw new NotFoundException('Anamnesis not found');
    return (result.affected ?? 0) > 0;
  }
}
