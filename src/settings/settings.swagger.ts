import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SwaggerAdmin, SwaggerAuthUser } from '../common/swagger.decorators';

const settingsExample = {
  logoBase64: 'iVBORw0KG...',
  logoMime: 'image/png',
  footerText: 'LABORATÓRIO EXEMPLO\nRUA EXEMPLO, 100 - CIDADE/UF',
};

export const SettingsSwagger = {
  getSettings: () =>
    applyDecorators(
      SwaggerAuthUser(),
      ApiOperation({ summary: 'Obter configurações do laudo (logo e rodapé)' }),
      ApiResponse({
        status: 200,
        description: 'Configurações atuais (campos nulos quando não definidos)',
        schema: { example: settingsExample },
      }),
    ),

  updateLogo: () =>
    applyDecorators(
      SwaggerAdmin(),
      ApiOperation({ summary: 'Enviar/atualizar a logo institucional (admin)' }),
      ApiResponse({
        status: 200,
        description: 'Logo atualizada com sucesso',
        schema: { example: settingsExample },
      }),
    ),

  removeLogo: () =>
    applyDecorators(
      SwaggerAdmin(),
      ApiOperation({ summary: 'Remover a logo institucional (admin)' }),
      ApiResponse({
        status: 200,
        description: 'Logo removida com sucesso',
        schema: { example: { message: 'Logo has been removed successfully' } },
      }),
    ),

  updateFooter: () =>
    applyDecorators(
      SwaggerAdmin(),
      ApiOperation({ summary: 'Enviar/atualizar o texto do rodapé do laudo (admin)' }),
      ApiResponse({
        status: 200,
        description: 'Rodapé atualizado com sucesso',
        schema: { example: settingsExample },
      }),
    ),

  removeFooter: () =>
    applyDecorators(
      SwaggerAdmin(),
      ApiOperation({ summary: 'Remover o texto do rodapé do laudo (admin)' }),
      ApiResponse({
        status: 200,
        description: 'Rodapé removido com sucesso',
        schema: { example: { message: 'Footer has been removed successfully' } },
      }),
    ),
};
