import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { QueryAuditLogDto } from './dto/query-audit-log.dto';

// SEM @AllowCommonUser(): o AdminGuard global já barra usuário comum (403).
@ApiTags('Auditoria')
@Controller('audit-log')
export class AuditController {
  constructor(private readonly service: AuditService) {}

  @Get()
  async find(@Query() query: QueryAuditLogDto) {
    return this.service.find(query);
  }
}
