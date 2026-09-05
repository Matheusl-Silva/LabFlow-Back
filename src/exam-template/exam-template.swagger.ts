import { applyDecorators } from '@nestjs/common'
import { Role } from '../common/enums/role.enum'
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger'
import { ExamTemplate } from '../entities/exam-template.entity'
import { SwaggerRoles } from '../common/swagger.decorators'

export const ExamTemplateSwagger = {
    findActiveTemplates: () =>
        applyDecorators(
            SwaggerRoles(Role.EXAM_TEMPLATES, Role.EXAMS),
            ApiOperation({ summary: 'Listar templates de exame ativos' }),
            ApiResponse({
                status: 200,
                description: 'Lista de templates ativos retornada com sucesso',
                type: [ExamTemplate],
            }),
        ),

    findAllTemplates: () =>
        applyDecorators(
            SwaggerRoles(Role.EXAM_TEMPLATES),
            ApiOperation({ summary: 'Listar todos os templates de exame' }),
            ApiResponse({
                status: 200,
                description: 'Lista completa de templates retornada com sucesso',
                type: [ExamTemplate],
            }),
        ),

    findTemplateById: () =>
        applyDecorators(
            SwaggerRoles(Role.EXAM_TEMPLATES, Role.EXAMS),
            ApiOperation({ summary: 'Buscar template de exame por ID' }),
            ApiParam({ name: 'id', description: 'ID do template', type: Number }),
            ApiResponse({
                status: 200,
                description: 'Template retornado com sucesso',
                type: ExamTemplate,
            }),
            ApiResponse({ status: 404, description: 'Template não encontrado' }),
        ),

    createTemplate: () =>
        applyDecorators(
            SwaggerRoles(Role.EXAM_TEMPLATES),
            ApiOperation({ summary: 'Criar novo template de exame' }),
            ApiResponse({
                status: 201,
                description: 'Template criado com sucesso',
                type: ExamTemplate,
            }),
        ),

    createNewVersion: () =>
        applyDecorators(
            SwaggerRoles(Role.EXAM_TEMPLATES),
            ApiOperation({ summary: 'Criar nova versão de um template de exame' }),
            ApiParam({ name: 'id', description: 'ID do template original', type: Number }),
            ApiResponse({
                status: 201,
                description: 'Nova versão do template criada com sucesso',
                type: ExamTemplate,
            }),
            ApiResponse({ status: 404, description: 'Template não encontrado' }),
        ),

    updateTemplate: () =>
        applyDecorators(
            SwaggerRoles(Role.EXAM_TEMPLATES),
            ApiOperation({ summary: 'Atualizar dados de template de exame' }),
            ApiParam({ name: 'id', description: 'ID do template', type: Number }),
            ApiResponse({
                status: 200,
                description: 'Template atualizado com sucesso',
                schema: { example: { message: 'Exam template has been updated successfully' } },
            }),
            ApiResponse({ status: 404, description: 'Template não encontrado' }),
        ),

    deleteTemplate: () =>
        applyDecorators(
            SwaggerRoles(Role.EXAM_TEMPLATES),
            ApiOperation({ summary: 'Deletar template de exame (soft delete)' }),
            ApiParam({ name: 'id', description: 'ID do template', type: Number }),
            ApiResponse({
                status: 200,
                description: 'Template deletado com sucesso',
                schema: { example: { message: 'Exam template has been deleted successfully' } },
            }),
            ApiResponse({ status: 404, description: 'Template não encontrado' }),
        ),
}
