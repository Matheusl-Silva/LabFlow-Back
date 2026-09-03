import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Exam } from '../entities/exam.entity';
import { In, QueryFailedError, Repository } from 'typeorm';
import { CreateExamDto } from './dto/create-exam.dto';
import { isValidExam } from './validators/exam.validator';
import { ExamTemplate } from '../entities/exam-template.entity';
import { User } from '../entities/user.entity';
import { UpdateExamDto } from './dto/update-exam.dto';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditEntity } from '../audit/audit.types';

@Injectable()
export class ExamService {
  constructor(
    @InjectRepository(Exam) private readonly repo: Repository<Exam>,
    @InjectRepository(ExamTemplate)
    private readonly templateRepo: Repository<ExamTemplate>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly audit: AuditService,
  ) {}

  /**
   * Preceptor e responsável têm de ser administradores ativos — mesma regra
   * que o <select> do formulário aplica (GET /user/exam-staff). Repetida aqui
   * porque a tela é conveniência, não autorização: um POST direto na API
   * passaria por cima dela.
   *
   * Só valida o que o DTO trouxe: no PUT, campo ausente significa "não mexer".
   * `is_admin`/`is_active` são as colunas que a listagem também consulta, então
   * as duas pontas nunca discordam sobre quem é elegível.
   */
  private async assertExamStaff(ids: (number | undefined)[]): Promise<void> {
    const wanted = [...new Set(ids.filter((id): id is number => id != null))];
    if (wanted.length === 0) return;

    const eligible = await this.userRepo.find({
      where: { id: In(wanted), isAdmin: true, isActive: true },
      select: { id: true },
    });

    if (eligible.length !== wanted.length) {
      throw new BadRequestException(
        'Preceptor e responsável devem ser administradores ativos',
      );
    }
  }

  async create(dto: CreateExamDto, userId: number): Promise<Exam> {
    const template = await this.templateRepo.findOneBy({id: dto.examTemplateId});
    if(!template) throw new BadRequestException("Exam template does not exist");

    if(!isValidExam(dto.data, template.schema)) throw new BadRequestException("The exam does not follow it's schema");

    await this.assertExamStaff([dto.preceptorId, dto.responsibleId]);

    const exam = this.repo.create(dto);
    try {
      const saved = await this.repo.save(exam);
      await this.audit.record({
        action: AuditAction.CREATE,
        entity: AuditEntity.EXAM,
        entityId: saved.id,
        userId,
        after: { ...saved },
      });
      return saved;
    } catch (err) {
      // FK inexistente (patient_id, preceptor_id ou responsible_id): responde 400
      // em vez de deixar o erro de banco virar 500.
      if (err instanceof QueryFailedError && err.driverError?.code === '23503') {
        throw new BadRequestException('Paciente, preceptor ou responsável inexistente');
      }
      throw err;
    }
  }

  async get(): Promise<Exam[]> {
    return this.repo.find();
  }

  async getByPatientId(patientId: number): Promise<Exam[]> {
    return this.repo.find({
      select:{
        id: true,
        date: true,
        preceptor: {
          name: true
        },
        examTemplate: {
          name: true
        },
      },
      relations: { 
        preceptor: true,
        examTemplate: true
      },
      where: { patientId }
    });
  }

  async getById(id: number): Promise<Exam | null> {
    const exam = await this.repo.createQueryBuilder("exam")
    .leftJoin("exam.examTemplate", "examTemplate")
    .select([
      "exam",
      "examTemplate.schema",
      // Material e método vivem no modelo, mas quem os imprime é o laudo do
      // exame — sem isso o cliente precisaria de um GET /template/:id extra.
      "examTemplate.material",
      "examTemplate.method"
    ])
    .where({id})
    .getOne();

    if(!exam) throw new NotFoundException("Exam not found");
    return exam;
  }

  async getPrivateById(id: number): Promise<Exam | null>{
    const exam = await this.repo.findOne({
      where:{id},
      relations:{
        preceptor: true,
        responsible: true,
        examTemplate: true
      },
      select:{
        id: true,
        date: true,
        preceptor:{
          name: true
        },
        responsible:{
          name: true
        },
        examTemplate:{
          schema: true,
          material: true,
          method: true
        },
        data: true,
        observation: true,
        internalObservation: true
      },
    });

    if(!exam) throw new NotFoundException("Exam not found");
    return exam;
  }

  async update(id: number, dto: UpdateExamDto, userId: number){
    const exam = await this.repo.findOneBy({id});
    if(!exam) throw new NotFoundException('Exam not found');

    const template = await this.templateRepo.findOneBy({id: exam.examTemplateId});
    if(!template) throw new InternalServerErrorException("Template not found");

    if(dto.data && !isValidExam(dto.data, template.schema)) throw new BadRequestException("The exam does not follow it's schema");

    await this.assertExamStaff([dto.preceptorId, dto.responsibleId]);

    const before = { ...exam }; // snapshot antes de alterar

    try {
      const result = await this.repo.update(id, dto);
      const after = await this.repo.findOneBy({id});
      await this.audit.record({
        action: AuditAction.UPDATE,
        entity: AuditEntity.EXAM,
        entityId: id,
        userId,
        before,
        after: after ? { ...after } : null,
      });
      return (result.affected ?? 0) > 0;
    } catch (err) {
      // FK inexistente (preceptor_id ou responsible_id): 400 em vez de 500.
      if (err instanceof QueryFailedError && err.driverError?.code === '23503') {
        throw new BadRequestException('Preceptor ou responsável inexistente');
      }
      throw err;
    }
  }

  /**
   * Registra no histórico que o laudo deste exame foi emitido.
   *
   * O laudo é gerado no navegador (window.print()), então o backend jamais
   * saberia da emissão por conta própria — o cliente avisa antes de imprimir.
   * Não altera nada no exame: o evento em si (quem, qual exame, quando) é a
   * informação que interessa a quem audita, e é o que o log já guarda. Daí
   * `before`/`after` ficarem nulos.
   */
  async registerReport(id: number, userId: number): Promise<void> {
    // Só a existência importa: nada do conteúdo do exame vai para o log.
    const exists = await this.repo.findOne({where: {id}, select: {id: true}});
    if(!exists) throw new NotFoundException("Exam not found");

    await this.audit.record({
      action: AuditAction.PRINT,
      entity: AuditEntity.EXAM,
      entityId: id,
      userId,
    });
  }

  async softDelete(id: number, userId: number): Promise<boolean>{
    const exam = await this.repo.findOneBy({id});
    if(!exam) throw new NotFoundException("Exam not found");

    const result = await this.repo.softDelete(id);
    await this.audit.record({
      action: AuditAction.DELETE,
      entity: AuditEntity.EXAM,
      entityId: id,
      userId,
      before: { ...exam },
    });
    return (result.affected ?? 0) > 0;
  }
}
