import { Repository } from 'typeorm';
import { ExamTemplate } from '../../entities/exam-template.entity';
import { NotFoundException } from '@nestjs/common';
import { CreateExamDto } from '../dto/create-exam.dto';

export async function isValidExam(
  templateRepo: Repository<ExamTemplate>,
  dto: CreateExamDto,
): Promise<boolean> {
  const template = await templateRepo.findOneBy({ id: dto.examTemplateId });
  if (!template) throw new NotFoundException('Exam Template not found');

  const keys = Object.keys(template.schema);
  if (keys.length !== Object.keys(dto.data).length){
    console.log("caiu aqui1");
    return false;
  }
  return keys.every((item) => {
    if (!dto.data[item]) {
      console.log("caiu aqui2");
    }
    return true;
  });
}
