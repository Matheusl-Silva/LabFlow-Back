import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { StockItem } from '../entities/stock-item.entity';
import { SwaggerAdmin, SwaggerAuthUser } from '../common/swagger.decorators';

export const StockSwagger = {
  findItems: () =>
    applyDecorators(
      SwaggerAuthUser(),
      ApiOperation({ summary: 'Listar itens do estoque' }),
      ApiResponse({
        status: 200,
        description: 'Lista de itens retornada com sucesso',
        type: [StockItem],
      }),
    ),

  findItemById: () =>
    applyDecorators(
      SwaggerAuthUser(),
      ApiOperation({ summary: 'Buscar item de estoque por ID' }),
      ApiParam({ name: 'id', description: 'ID do item', type: Number }),
      ApiResponse({ status: 200, description: 'Item retornado com sucesso', type: StockItem }),
      ApiResponse({ status: 404, description: 'Item não encontrado' }),
    ),

  createItem: () =>
    applyDecorators(
      SwaggerAdmin(),
      ApiOperation({ summary: 'Cadastrar item no estoque' }),
      ApiResponse({ status: 201, description: 'Item cadastrado com sucesso', type: StockItem }),
      ApiResponse({ status: 409, description: 'Já existe um item com esse nome' }),
    ),

  updateItem: () =>
    applyDecorators(
      SwaggerAdmin(),
      ApiOperation({ summary: 'Atualizar item do estoque' }),
      ApiParam({ name: 'id', description: 'ID do item', type: Number }),
      ApiResponse({ status: 200, description: 'Item atualizado com sucesso', type: StockItem }),
      ApiResponse({ status: 404, description: 'Item não encontrado' }),
    ),

  adjustQuantity: () =>
    applyDecorators(
      SwaggerAuthUser(),
      ApiOperation({
        summary: 'Registrar entrada/saída de estoque',
        description:
          'Soma `delta` à quantidade atual. Use valores negativos para saída. A operação é atômica e falha com 400 se deixaria o estoque negativo.',
      }),
      ApiParam({ name: 'id', description: 'ID do item', type: Number }),
      ApiResponse({ status: 200, description: 'Quantidade atualizada', type: StockItem }),
      ApiResponse({ status: 400, description: 'Delta zero ou estoque insuficiente' }),
      ApiResponse({ status: 404, description: 'Item não encontrado' }),
    ),

  deleteItem: () =>
    applyDecorators(
      SwaggerAdmin(),
      ApiOperation({ summary: 'Excluir item do estoque' }),
      ApiParam({ name: 'id', description: 'ID do item', type: Number }),
      ApiResponse({
        status: 200,
        description: 'Item excluído com sucesso',
        schema: { example: true },
      }),
      ApiResponse({ status: 404, description: 'Item não encontrado' }),
    ),
};
