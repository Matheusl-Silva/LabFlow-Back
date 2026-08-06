import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ExamTemplateController } from './exam-template.controller';
import { RolesGuard } from '../common/guards/roles.guard';
import { Role } from '../common/enums/role.enum';

/**
 * O que estes testes protegem: quem tem só `EXAMS` precisa LER os modelos para
 * conseguir lançar um exame (sem a lista não há o que escolher), mas não pode
 * criar, editar nem excluir modelo nenhum. É a única rota com papéis diferentes
 * por handler — exatamente o tipo de regra que se perde num refactor.
 *
 * Testamos o guard de verdade (Reflector real lendo os decorators), e não a
 * presença do metadata: é o comportamento — passa ou 403 — que importa.
 */
describe('ExamTemplateController (autorização)', () => {
  const guard = new RolesGuard(new Reflector());

  type Handler = keyof ExamTemplateController;

  const context = (handler: Handler, roles: Role[]): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ user: { id: 1, isAdmin: false, roles } }),
      }),
      getHandler: () => ExamTemplateController.prototype[handler],
      getClass: () => ExamTemplateController,
    }) as unknown as ExecutionContext;

  const READ_HANDLERS: Handler[] = ['getActives', 'getById'];
  const WRITE_HANDLERS: Handler[] = [
    'getAll',
    'create',
    'createNewVersion',
    'update',
    'softDelete',
  ];

  describe('papel EXAMS (só lança exames)', () => {
    it.each(READ_HANDLERS)('lê os modelos em %s', (handler) => {
      expect(guard.canActivate(context(handler, [Role.EXAMS]))).toBe(true);
    });

    // `getAll` entra aqui de propósito: traz também as versões desativadas, que
    // só interessam a quem administra os modelos.
    it.each(WRITE_HANDLERS)('não altera os modelos em %s', (handler) => {
      expect(() => guard.canActivate(context(handler, [Role.EXAMS]))).toThrow(
        ForbiddenException,
      );
    });
  });

  describe('papel EXAM_TEMPLATES (gestão de modelos)', () => {
    it.each([...READ_HANDLERS, ...WRITE_HANDLERS])('passa em %s', (handler) => {
      expect(
        guard.canActivate(context(handler, [Role.EXAM_TEMPLATES])),
      ).toBe(true);
    });
  });

  describe('outros papéis', () => {
    it('não enxerga os modelos', () => {
      expect(() =>
        guard.canActivate(context('getActives', [Role.STOCK])),
      ).toThrow(ForbiddenException);
    });

    it('usuário sem papel nenhum toma 403', () => {
      expect(() => guard.canActivate(context('getActives', []))).toThrow(
        ForbiddenException,
      );
    });
  });
});
