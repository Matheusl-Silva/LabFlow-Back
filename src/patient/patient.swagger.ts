import { applyDecorators } from '@nestjs/common'
import { Role } from '../common/enums/role.enum'
import { ApiOperation, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger'
import { Patient } from '../entities/patient.entity'
import { SwaggerRoles } from '../common/swagger.decorators'

export const PatientSwagger = {
    findPatients: () =>
        applyDecorators(
            SwaggerRoles(Role.PATIENTS, Role.EXAMS, Role.EXAM_TEMPLATES, Role.ANAMNESIS),
            ApiOperation({ summary: 'Listar todos os pacientes' }),
            ApiResponse({
                status: 200,
                description: 'Lista de pacientes retornada com sucesso',
                type: [Patient],
            }),
        ),

    findPatientById: () =>
        applyDecorators(
            SwaggerRoles(Role.PATIENTS, Role.EXAMS, Role.EXAM_TEMPLATES, Role.ANAMNESIS),
            ApiOperation({ summary: 'Buscar paciente por ID' }),
            ApiParam({ name: 'id', description: 'ID do paciente', type: Number }),
            ApiResponse({
                status: 200,
                description: 'Paciente retornado com sucesso',
                type: Patient,
            }),
            ApiResponse({ status: 404, description: 'Paciente não encontrado' }),
        ),

    createPatient: () =>
        applyDecorators(
            SwaggerRoles(Role.PATIENTS),
            ApiOperation({
                summary: 'Cadastrar novo paciente',
                description:
                    'Se houver um paciente EXCLUÍDO com o mesmo CPF, a chamada é recusada com ' +
                    '409 `code: PATIENT_RETURNING` — é a mesma pessoa voltando, e reativar o ' +
                    'cadastro traz junto o histórico de exames e anamneses. Repita a chamada ' +
                    'com `?confirmReturn=true` para confirmar o retorno.',
            }),
            ApiQuery({
                name: 'confirmReturn',
                required: false,
                type: Boolean,
                description:
                    'Confirma a reativação do cadastro excluído de mesmo CPF. Sem efeito quando ' +
                    'não existe cadastro excluído com esse CPF.',
            }),
            ApiResponse({
                status: 201,
                description: 'Paciente cadastrado com sucesso',
                type: Patient,
            }),
            ApiResponse({
                status: 409,
                description:
                    'CPF já usado por um paciente ativo, ou paciente excluído aguardando ' +
                    'confirmação de retorno (`code: PATIENT_RETURNING`)',
                schema: {
                    example: {
                        statusCode: 409,
                        error: 'Conflict',
                        code: 'PATIENT_RETURNING',
                        message:
                            'Já existe um paciente excluído com este CPF. ' +
                            'Confirme o retorno para reativar o cadastro.',
                        patient: {
                            id: 23,
                            name: 'Maria da Silva',
                            deletedAt: '2026-08-14T10:32:00.000Z',
                            examCount: 4,
                            anamnesisCount: 1,
                        },
                    },
                },
            }),
        ),

    updatePatient: () =>
        applyDecorators(
            SwaggerRoles(Role.PATIENTS),
            ApiOperation({ summary: 'Atualizar dados de paciente' }),
            ApiParam({ name: 'id', description: 'ID do paciente', type: Number }),
            ApiResponse({
                status: 200,
                description: 'Paciente atualizado com sucesso',
                schema: { example: { message: 'Patient has been updated successfully' } },
            }),
            ApiResponse({ status: 404, description: 'Paciente não encontrado' }),
        ),

    deletePatient: () =>
        applyDecorators(
            SwaggerRoles(Role.PATIENTS),
            ApiOperation({ summary: 'Deletar paciente' }),
            ApiParam({ name: 'id', description: 'ID do paciente', type: Number }),
            ApiResponse({
                status: 200,
                description: 'Paciente deletado com sucesso',
                schema: { example: true },
            }),
            ApiResponse({ status: 404, description: 'Paciente não encontrado' }),
        ),
}
