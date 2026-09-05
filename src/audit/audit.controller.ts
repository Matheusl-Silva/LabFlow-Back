import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { QueryAuditLogDto } from './dto/query-audit-log.dto';
import { AuditSwagger } from './audit.swagger';

// SEM decorator de papel: o RolesGuard é fail-closed, então a rota já é
// exclusiva de administrador. Auditoria é administração do sistema e não vira
// papel delegável.
@ApiTags('Auditoria')
@Controller('audit-log')
export class AuditController {
  constructor(private readonly service: AuditService) {}

  @AuditSwagger.findLogs()
  @Get()
  async find(@Query() query: QueryAuditLogDto) {
    return this.service.find(query);
  }
}
