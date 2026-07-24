import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateAnamnesisDto } from './dto/create-anamnesis.dto';
import { UpdateAnamnesisDto } from './dto/update-anamnesis.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Anamnesis } from '../entities/anamnesis.entity';
import { Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditEntity } from '../audit/audit.types';

@Injectable()
export class AnamnesisService {
  constructor(
    @InjectRepository(Anamnesis) private readonly repo: Repository<Anamnesis>,
    private readonly audit: AuditService,
  ){}

  async create(dto: CreateAnamnesisDto, userId: number): Promise<Anamnesis> {
    const anamnesis = await this.repo.create(dto);
    const saved = await this.repo.save(anamnesis);
    await this.audit.record({
      action: AuditAction.CREATE,
      entity: AuditEntity.ANAMNESIS,
      entityId: saved.id,
      userId,
      after: { ...saved },
    });
    return saved;
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

  async update(id: number, dto: UpdateAnamnesisDto, userId: number): Promise<boolean>{
    const anamnesis = await this.repo.findOneBy({id});
    if(!anamnesis) throw new NotFoundException('Anamnesis not found');

    const before = { ...anamnesis };
    const result = await this.repo.update(id, dto);
    const after = await this.repo.findOneBy({id});
    await this.audit.record({
      action: AuditAction.UPDATE,
      entity: AuditEntity.ANAMNESIS,
      entityId: id,
      userId,
      before,
      after: after ? { ...after } : null,
    });
    return (result.affected ?? 0) > 0;
  }

  async delete(id: number, userId: number): Promise<boolean> {
    const anamnesis = await this.repo.findOneBy({id});
    if(!anamnesis) throw new NotFoundException('Anamnesis not found');

    // Soft delete: preserva o registro clínico (marca deleted_at) em vez de
    // apagar a linha.
    const result = await this.repo.softDelete(id);
    if(!result.affected) throw new NotFoundException('Anamnesis not found');
    await this.audit.record({
      action: AuditAction.DELETE,
      entity: AuditEntity.ANAMNESIS,
      entityId: id,
      userId,
      before: { ...anamnesis },
    });
    return (result.affected ?? 0) > 0;
  }
}
