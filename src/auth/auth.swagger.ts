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

    forgotPassword: () =>
        applyDecorators(
            SwaggerPublic(),
            ApiOperation({
                summary: 'Pedir link de redefinição de senha',
                description:
                    'Envia por e-mail um link de uso único para escolher uma nova senha. ' +
                    'A resposta é SEMPRE a mesma, exista ou não uma conta com o endereço informado — ' +
                    'do contrário a rota viraria um verificador de quais e-mails têm cadastro. ' +
                    'Contas inativas (pendentes de aprovação) não recebem o link: redefinir a senha ' +
                    'não libera o acesso delas.',
            }),
            ApiResponse({
                status: 202,
                description: 'Pedido recebido (não confirma se o e-mail existe)',
                schema: {
                    example: {
                        message:
                            'Se houver uma conta ativa com este e-mail, um link de redefinição foi enviado.',
                    },
                },
            }),
            ApiResponse({ status: 429, description: 'Muitos pedidos a partir deste IP' }),
        ),

    resetPassword: () =>
        applyDecorators(
            SwaggerPublic(),
            ApiOperation({
                summary: 'Redefinir a senha com o token recebido por e-mail',
                description:
                    'Consome o token (uso único) e grava a nova senha. Derruba TODAS as sessões ' +
                    'abertas do usuário e apaga o cookie de refresh deste navegador: quem redefine ' +
                    'a senha normalmente suspeita de conta comprometida, e um refresh de dias ' +
                    'manteria o invasor logado depois da troca.',
            }),
            ApiResponse({
                status: 200,
                description: 'Senha redefinida',
                schema: {
                    example: { message: 'Senha redefinida com sucesso. Entre com a nova senha.' },
                },
            }),
            ApiResponse({
                status: 400,
                description: 'Token inexistente, expirado, já usado, ou conta inativa',
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
