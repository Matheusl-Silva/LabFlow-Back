import { applyDecorators } from '@nestjs/common'
import { ApiOperation, ApiResponse } from '@nestjs/swagger'
import { SwaggerPublic } from '../common/swagger.decorators'

export const AuthSwagger = {
    signup: () =>
        applyDecorators(
            SwaggerPublic(),
            ApiOperation({ summary: 'Cadastrar novo usuário' }),
            ApiResponse({
                status: 201,
                description: 'Usuário cadastrado com sucesso',
                schema: { example: { token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' } },
            }),
            ApiResponse({ status: 409, description: 'Usuário já cadastrado' }),
        ),

    signin: () =>
        applyDecorators(
            SwaggerPublic(),
            ApiOperation({ summary: 'Autenticar usuário' }),
            ApiResponse({
                status: 200,
                description: 'Login realizado com sucesso',
                schema: { example: { token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' } },
            }),
            ApiResponse({ status: 401, description: 'Credenciais inválidas' }),
        ),
}
