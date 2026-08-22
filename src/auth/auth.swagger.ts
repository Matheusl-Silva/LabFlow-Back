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
            ApiOperation({
                summary: 'Autenticar usuário',
                description:
                    'Devolve o access token no corpo e grava o refresh token num cookie httpOnly ' +
                    '(`labflow_refresh`). O refresh não aparece na resposta de propósito: o JavaScript ' +
                    'da página não deve conseguir lê-lo.',
            }),
            ApiResponse({
                status: 200,
                description: 'Login realizado com sucesso',
                schema: { example: { token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' } },
            }),
            ApiResponse({ status: 401, description: 'Credenciais inválidas' }),
            ApiResponse({ status: 403, description: 'Conta pendente de aprovação de um administrador' }),
        ),

    refresh: () =>
        applyDecorators(
            SwaggerPublic(),
            ApiOperation({
                summary: 'Renovar o access token a partir do cookie de sessão',
                description:
                    'Lê o refresh token do cookie httpOnly `labflow_refresh` — não há corpo nem header a enviar. ' +
                    'Devolve um access token novo e ROTACIONA o refresh: o token usado deixa de valer na hora. ' +
                    'Os papéis são relidos do banco, então uma alteração de permissão vale a partir da próxima renovação.',
            }),
            ApiResponse({
                status: 200,
                description: 'Token renovado',
                schema: { example: { token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' } },
            }),
            ApiResponse({
                status: 401,
                description: 'Sessão ausente, expirada, revogada ou de usuário desativado',
            }),
        ),

    logout: () =>
        applyDecorators(
            SwaggerPublic(),
            ApiOperation({
                summary: 'Encerrar a sessão',
                description:
                    'Revoga a cadeia de renovações inteira no servidor e apaga o cookie. ' +
                    'Responde 204 mesmo sem cookie válido: sair nunca falha.',
            }),
            ApiResponse({ status: 204, description: 'Sessão encerrada' }),
        ),
}
