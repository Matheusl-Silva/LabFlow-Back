import { applyDecorators } from '@nestjs/common'
import { ApiOperation, ApiResponse } from '@nestjs/swagger'
import { SwaggerPublic } from '../common/swagger.decorators'

export const AuthSwagger = {
    signup: () =>
        applyDecorators(
            SwaggerPublic(),
            ApiOperation({
                summary: 'Auto-cadastro de usuário (nasce pendente de aprovação)',
                description:
                    'O usuário é criado inativo e só consegue logar após um administrador aprovar. ' +
                    'Exceção: se ainda não houver nenhum usuário no sistema, o primeiro cadastro vira o administrador inicial (ativo).',
            }),
            ApiResponse({
                status: 201,
                description: 'Cadastro recebido',
                schema: { example: { message: 'Cadastro recebido. Aguarde a aprovação de um administrador para acessar.' } },
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
            ApiResponse({ status: 403, description: 'Conta pendente de aprovação de um administrador' }),
        ),
}
