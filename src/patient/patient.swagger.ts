import { applyDecorators } from '@nestjs/common'
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger'
import { Patient } from '../entities/patient.entity'
import { SwaggerAdmin, SwaggerAuthUser } from '../common/swagger.decorators'

export const PatientSwagger = {
    findPatients: () =>
        applyDecorators(
            SwaggerAuthUser(),
            ApiOperation({ summary: 'Listar todos os pacientes' }),
            ApiResponse({
                status: 200,
                description: 'Lista de pacientes retornada com sucesso',
                type: [Patient],
            }),
        ),

    findPatientById: () =>
        applyDecorators(
            SwaggerAdmin(),
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
            SwaggerAdmin(),
            ApiOperation({ summary: 'Cadastrar novo paciente' }),
            ApiResponse({
                status: 201,
                description: 'Paciente cadastrado com sucesso',
                type: Patient,
            }),
            ApiResponse({ status: 409, description: 'Paciente já cadastrado' }),
        ),

    updatePatient: () =>
        applyDecorators(
            SwaggerAdmin(),
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
            SwaggerAdmin(),
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
