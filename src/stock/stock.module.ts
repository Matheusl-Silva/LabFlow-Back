import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StockController } from './stock.controller';
import { StockService } from './stock.service';
import { StockItem } from '../entities/stock-item.entity';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [TypeOrmModule.forFeature([StockItem]), AuditModule],
  controllers: [StockController],
  providers: [StockService],
})
export class StockModule {}
