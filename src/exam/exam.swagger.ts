import { applyDecorators } from '@nestjs/common'
import { Role } from '../common/enums/role.enum'
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger'
import { Exam } from '../entities/exam.entity'
import { SwaggerRoles } from '../common/swagger.decorators'

export const ExamSwagger = {
    findExams: () =>
        applyDecorators(
            SwaggerRoles(Role.EXAMS, Role.EXAM_TEMPLATES),
            ApiOperation({ summary: 'Listar todos os exames' }),
            ApiResponse({
                status: 200,
                description: 'Lista de exames retornada com sucesso',
                type: [Exam],
            }),
        ),

    findExamById: () =>
        applyDecorators(
            SwaggerRoles(Role.EXAMS, Role.EXAM_TEMPLATES),
            ApiOperation({ summary: 'Buscar exame por ID' }),
            ApiParam({ name: 'id', description: 'ID do exame', type: Number }),
            ApiResponse({
                status: 200,
                description: 'Exame retornado com sucesso',
                type: Exam,
            }),
            ApiResponse({ status: 404, description: 'Exame não encontrado' }),
        ),

    findExamsByPatientId: () =>
        applyDecorators(
            SwaggerRoles(Role.EXAMS, Role.EXAM_TEMPLATES),
            ApiOperation({ summary: 'Listar exames por ID do paciente' }),
            ApiParam({ name: 'id', description: 'ID do paciente', type: Number }),
            ApiResponse({
                status: 200,
                description: 'Lista de exames do paciente retornada com sucesso',
                type: [Exam],
            }),
            ApiResponse({ status: 404, description: 'Paciente não encontrado' }),
        ),

    createExam: () =>
        applyDecorators(
            SwaggerRoles(Role.EXAMS, Role.EXAM_TEMPLATES),
            ApiOperation({ summary: 'Criar novo exame' }),
            ApiResponse({
                status: 201,
                description: 'Exame criado com sucesso',
                type: Exam,
            }),
        ),

    registerExamReport: () =>
        applyDecorators(
            SwaggerRoles(Role.EXAMS, Role.EXAM_TEMPLATES),
            ApiOperation({
                summary: 'Registrar a emissão do laudo no histórico',
                description:
                    'Não gera arquivo: o laudo é montado no navegador. Esta rota apenas ' +
                    'grava no histórico de auditoria quem emitiu o laudo do exame, e quando.',
            }),
            ApiParam({ name: 'id', description: 'ID do exame', type: Number }),
            ApiResponse({
                status: 201,
                description: 'Emissão registrada com sucesso',
                schema: { example: { message: 'Exam report has been registered successfully' } },
            }),
            ApiResponse({ status: 404, description: 'Exame não encontrado' }),
        ),

    updateExam: () =>
        applyDecorators(
            SwaggerRoles(Role.EXAM_TEMPLATES),
            ApiOperation({ summary: 'Atualizar dados de exame' }),
            ApiParam({ name: 'id', description: 'ID do exame', type: Number }),
            ApiResponse({
                status: 200,
                description: 'Exame atualizado com sucesso',
                schema: { example: { message: 'Exam has been updated successfully' } },
            }),
            ApiResponse({ status: 404, description: 'Exame não encontrado' }),
        ),

    deleteExam: () =>
        applyDecorators(
            SwaggerRoles(Role.EXAM_TEMPLATES),
            ApiOperation({ summary: 'Deletar exame (soft delete)' }),
            ApiParam({ name: 'id', description: 'ID do exame', type: Number }),
            ApiResponse({
                status: 200,
                description: 'Exame deletado com sucesso',
                schema: { example: { message: 'Exam has been deleted successfully' } },
            }),
            ApiResponse({ status: 404, description: 'Exame não encontrado' }),
        ),
}
