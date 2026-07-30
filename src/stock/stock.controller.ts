import {
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { QueryFailedError } from 'typeorm';
import { StockService } from './stock.service';
import { StockItem } from '../entities/stock-item.entity';
import { CreateStockItemDto } from './dto/create-stock-item.dto';
import { UpdateStockItemDto } from './dto/update-stock-item.dto';
import { AdjustStockQuantityDto } from './dto/adjust-stock-quantity.dto';
import { StockSwagger } from './stock.swagger';
import { AllowCommonUser } from '../common/decorators/allow-common-user.decorator';
import { UserFromJwt } from '../common/decorators/user-jwt.decorator';
import type { JwtPayload } from '../common/types/jwt.payload.type';

@ApiTags('Estoque')
@Controller('stock')
export class StockController {
  constructor(private readonly stockService: StockService) {}

  // Consultar o estoque é rotina de bancada: qualquer usuário autenticado vê a
  // lista. Cadastrar, editar e excluir itens continua restrito ao admin.
  @StockSwagger.findItems()
  @AllowCommonUser()
  @Get()
  async get(): Promise<StockItem[]> {
    return this.stockService.get();
  }

  @StockSwagger.findItemById()
  @AllowCommonUser()
  @Get(':id')
  async getById(@Param('id', ParseIntPipe) id: number): Promise<StockItem> {
    return this.stockService.getById(id);
  }

  @StockSwagger.createItem()
  @Post()
  async create(
    @Body() dto: CreateStockItemDto,
    @UserFromJwt() user: JwtPayload,
  ): Promise<StockItem> {
    try {
      return await this.stockService.create(dto, user.id);
    } catch (err) {
      console.error(err);
      if (err instanceof QueryFailedError && err.driverError.code == '23505') {
        throw new ConflictException('Stock item already registered');
      }
      throw err;
    }
  }

  @StockSwagger.updateItem()
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStockItemDto,
    @UserFromJwt() user: JwtPayload,
  ): Promise<StockItem> {
    try {
      return await this.stockService.update(id, dto, user.id);
    } catch (err) {
      console.error(err);
      if (err instanceof QueryFailedError && err.driverError.code == '23505') {
        throw new ConflictException('Stock item already registered');
      }
      throw err;
    }
  }

  // Movimentar quantidade é liberado ao usuário comum: quem consome o material
  // na bancada é quem precisa dar baixa. Alterar o cadastro do item, não.
  @StockSwagger.adjustQuantity()
  @AllowCommonUser()
  @Patch(':id/quantity')
  async adjustQuantity(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AdjustStockQuantityDto,
    @UserFromJwt() user: JwtPayload,
  ): Promise<StockItem> {
    return this.stockService.adjustQuantity(id, dto, user.id);
  }

  @StockSwagger.deleteItem()
  @Delete(':id')
  async delete(
    @Param('id', ParseIntPipe) id: number,
    @UserFromJwt() user: JwtPayload,
  ): Promise<boolean> {
    return this.stockService.delete(id, user.id);
  }
}
