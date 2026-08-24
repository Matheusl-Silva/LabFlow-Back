import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { FindOperator } from 'typeorm';
import { hash } from 'argon2';
import { AuthService } from './auth.service';
import { RefreshToken } from '../entities/refresh-token.entity';
import { User } from '../entities/user.entity';
import { Role } from '../common/enums/role.enum';

/**
 * A semântica da renovação é sutil o bastante para que a primeira versão dela
 * tivesse um furo real: a janela de tolerância a corrida entre abas dava carona
 * também aos tokens revogados por ROUBO, e o token emitido nessa carona nascia
 * válido — anulando a revogação inteira. Estes testes existem para que esse
 * furo (e os vizinhos) não voltem despercebidos.
 */

const SENHA = 'Password123';

/** Interpreta os operadores do TypeORM que o AuthService realmente usa. */
function bate(linha: Record<string, unknown>, where: Record<string, unknown>) {
  return Object.entries(where).every(([campo, criterio]) => {
    if (criterio instanceof FindOperator) {
      const valor = linha[campo];
      if (criterio.type === 'isNull')
        return valor === null || valor === undefined;
      if (criterio.type === 'lessThan') {
        return (valor as Date).getTime() < (criterio.value as Date).getTime();
      }
      throw new Error(`operador não coberto pelo teste: ${criterio.type}`);
    }
    return linha[campo] === criterio;
  });
}

/**
 * Repositório em memória. O `update` condicional é a peça que importa: ele
 * reproduz o "só um UPDATE encontra a linha com revoked_at NULL" que torna o
 * consumo do token atômico no Postgres.
 */
class FakeRefreshRepo {
  linhas: RefreshToken[] = [];
  private proximoId = 1;

  create(dados: Partial<RefreshToken>): RefreshToken {
    return { revokedAt: null, revokedReason: null, ...dados } as RefreshToken;
  }

  save(linha: RefreshToken): Promise<RefreshToken> {
    if (!linha.id) {
      linha.id = this.proximoId++;
      this.linhas.push(linha);
    }
    return Promise.resolve(linha);
  }

  findOneBy(where: Record<string, unknown>): Promise<RefreshToken | null> {
    return Promise.resolve(
      this.linhas.find((l) => bate(l as never, where)) ?? null,
    );
  }

  update(
    where: Record<string, unknown>,
    patch: Partial<RefreshToken>,
  ): Promise<{ affected: number }> {
    const alvos = this.linhas.filter((l) => bate(l as never, where));
    alvos.forEach((l) => Object.assign(l, patch));
    return Promise.resolve({ affected: alvos.length });
  }

  delete(where: Record<string, unknown>): Promise<{ affected: number }> {
    const antes = this.linhas.length;
    this.linhas = this.linhas.filter((l) => !bate(l as never, where));
    return Promise.resolve({ affected: antes - this.linhas.length });
  }
}

describe('AuthService — sessão', () => {
  let service: AuthService;
  let refreshRepo: FakeRefreshRepo;
  let usuario: User;
  let papeis: Role[];
  let env: Record<string, string>;

  const criar = () => {
    refreshRepo = new FakeRefreshRepo();

    const userRepo = {
      findOneBy: (where: { id?: number; email?: string }) => {
        const achou =
          where.id !== undefined
            ? usuario.id === where.id
            : usuario.email === where.email;
        return Promise.resolve(achou ? usuario : null);
      },
    };

    const userRoleRepo = {
      findBy: () =>
        Promise.resolve(papeis.map((role) => ({ userId: usuario.id, role }))),
    };

    service = new AuthService(
      userRepo as never,
      userRoleRepo as never,
      refreshRepo as never,
      // Token "assinado" como JSON: deixa o teste inspecionar os papéis que
      // foram parar dentro dele.
      { sign: (payload: unknown) => JSON.stringify(payload) } as never,
      { get: (chave: string) => env[chave] } as never,
    );
  };

  const papeisDoToken = (token: string): Role[] =>
    (JSON.parse(token) as { roles: Role[] }).roles;

  beforeAll(async () => {
    // argon2 é caro de propósito; um hash só serve para todos os testes.
    const passwordHash = await hash(SENHA);
    usuario = {
      id: 1,
      email: 'admin@labflow.test',
      passwordHash,
      isActive: true,
    } as User;
  });

  beforeEach(() => {
    papeis = [Role.EXAMS];
    env = {};
    usuario.isActive = true;
    criar();
  });

  describe('signin', () => {
    it('emite access token e refresh, guardando apenas o hash do refresh', async () => {
      const sessao = await service.signin({
        email: usuario.email,
        pass: SENHA,
      });

      expect(sessao.token).toBeTruthy();
      expect(sessao.refreshToken).toBeTruthy();
      expect(refreshRepo.linhas).toHaveLength(1);
      // O token em claro não pode existir em lugar nenhum da linha gravada.
      expect(JSON.stringify(refreshRepo.linhas[0])).not.toContain(
        sessao.refreshToken,
      );
      expect(refreshRepo.linhas[0].tokenHash).toHaveLength(64);
    });

    it('recusa conta pendente de aprovação sem emitir sessão', async () => {
      usuario.isActive = false;

      await expect(
        service.signin({ email: usuario.email, pass: SENHA }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(refreshRepo.linhas).toHaveLength(0);
    });

    it('usa o padrão de 7 dias quando REFRESH_TOKEN_DAYS está declarada e vazia', async () => {
      // Regressão: `?? 7` não intercepta string vazia, e `Number('')` é 0 — o
      // refresh nasceria expirado e a sessão voltaria a durar 15 minutos.
      env = { REFRESH_TOKEN_DAYS: '' };
      criar();

      const sessao = await service.signin({
        email: usuario.email,
        pass: SENHA,
      });
      const diasAteVencer =
        (sessao.refreshExpiresAt.getTime() - Date.now()) / 86_400_000;

      expect(diasAteVencer).toBeGreaterThan(6.9);
    });

    it('devolve o perfil do usuário junto com a sessão', async () => {
      // O front não decodifica mais o JWT para descobrir quem entrou: com o
      // token em cookie httpOnly ele não tem acesso ao payload, e este campo é
      // a única fonte do nome e dos papéis logo após o login.
      const sessao = await service.signin({
        email: usuario.email,
        pass: SENHA,
      });

      expect(sessao.user.id).toBe(usuario.id);
      expect(sessao.user.email).toBe(usuario.email);
      expect(sessao.user.roles).toEqual([Role.EXAMS]);
      // Nem o hash da senha nem qualquer token podem vazar no perfil.
      expect(JSON.stringify(sessao.user)).not.toContain(usuario.passwordHash);
      expect(JSON.stringify(sessao.user)).not.toContain(sessao.refreshToken);
    });

    it('faz o vencimento do cookie de acesso seguir JWT_EXPIRES_IN', async () => {
      // O `expires` do cookie httpOnly sai daqui. Se divergisse do `exp` do
      // token, o navegador guardaria credencial já morta (ou apagaria uma ainda
      // válida) — em ambos os casos, uma renovação a mais sem motivo.
      env = { JWT_EXPIRES_IN: '30m' };
      criar();

      const sessao = await service.signin({
        email: usuario.email,
        pass: SENHA,
      });
      const minutosAteVencer =
        (sessao.accessExpiresAt.getTime() - Date.now()) / 60_000;

      expect(minutosAteVencer).toBeGreaterThan(29);
      expect(minutosAteVencer).toBeLessThanOrEqual(30);
    });

    it('cai nos 15 minutos padrão quando JWT_EXPIRES_IN é ilegível', async () => {
      env = { JWT_EXPIRES_IN: 'quinze minutos' };
      criar();

      const sessao = await service.signin({
        email: usuario.email,
        pass: SENHA,
      });
      const minutosAteVencer =
        (sessao.accessExpiresAt.getTime() - Date.now()) / 60_000;

      expect(minutosAteVencer).toBeGreaterThan(14);
      expect(minutosAteVencer).toBeLessThanOrEqual(15);
    });
  });

  describe('refresh', () => {
    it('rotaciona: consome o token apresentado e emite o próximo na mesma família', async () => {
      const inicial = await service.signin({
        email: usuario.email,
        pass: SENHA,
      });
      const renovada = await service.refresh(inicial.refreshToken);

      expect(renovada.refreshToken).not.toBe(inicial.refreshToken);
      expect(refreshRepo.linhas).toHaveLength(2);

      const [consumido, novo] = refreshRepo.linhas;
      expect(consumido.revokedReason).toBe('ROTATED');
      expect(novo.revokedAt).toBeNull();
      expect(novo.familyId).toBe(consumido.familyId);
    });

    it('relê os papéis do banco, e não do token anterior', async () => {
      const inicial = await service.signin({
        email: usuario.email,
        pass: SENHA,
      });
      expect(papeisDoToken(inicial.token)).toEqual([Role.EXAMS]);

      // Um admin concede um papel novo enquanto a sessão está aberta.
      papeis = [Role.EXAMS, Role.PATIENTS];
      const renovada = await service.refresh(inicial.refreshToken);

      expect(papeisDoToken(renovada.token)).toEqual([
        Role.EXAMS,
        Role.PATIENTS,
      ]);
    });

    it('tolera corrida entre abas: token rotacionado há pouco ainda renova', async () => {
      const inicial = await service.signin({
        email: usuario.email,
        pass: SENHA,
      });
      await service.refresh(inicial.refreshToken);

      // A segunda aba chega com o MESMO cookie, logo em seguida.
      await expect(service.refresh(inicial.refreshToken)).resolves.toBeTruthy();
      expect(refreshRepo.linhas.filter((l) => !l.revokedAt)).toHaveLength(2);
    });

    it('derruba a família inteira quando o token volta fora da janela', async () => {
      const inicial = await service.signin({
        email: usuario.email,
        pass: SENHA,
      });
      await service.refresh(inicial.refreshToken);

      // Envelhece a revogação para além da tolerância: já não é corrida entre
      // abas, é cookie copiado.
      refreshRepo.linhas[0].revokedAt = new Date(Date.now() - 120_000);

      await expect(
        service.refresh(inicial.refreshToken),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(refreshRepo.linhas.every((l) => l.revokedAt)).toBe(true);
      expect(refreshRepo.linhas[1].revokedReason).toBe('REUSED');
    });

    it('não dá carona da janela a um token revogado por logout', async () => {
      // O furo original: a tolerância olhava só o RELÓGIO. Um logout (ou uma
      // revogação por roubo) acabara de acontecer, então o token estava dentro
      // da janela — e renovava, ressuscitando a sessão que tinha sido morta.
      const inicial = await service.signin({
        email: usuario.email,
        pass: SENHA,
      });
      await service.logout(inicial.refreshToken);

      await expect(
        service.refresh(inicial.refreshToken),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(refreshRepo.linhas.every((l) => l.revokedAt)).toBe(true);
    });

    it('recusa token vencido sem marcá-lo como rotacionado', async () => {
      const inicial = await service.signin({
        email: usuario.email,
        pass: SENHA,
      });
      refreshRepo.linhas[0].expiresAt = new Date(Date.now() - 1_000);

      await expect(
        service.refresh(inicial.refreshToken),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      // Vencido não é o mesmo que consumido: o motivo tem de continuar vazio.
      expect(refreshRepo.linhas[0].revokedReason).toBeNull();
    });

    it('mata a sessão de conta desativada sem emitir token novo', async () => {
      const inicial = await service.signin({
        email: usuario.email,
        pass: SENHA,
      });
      usuario.isActive = false;

      await expect(
        service.refresh(inicial.refreshToken),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      // O token apresentado foi consumido e nada entrou no lugar: a família
      // fica sem nenhum elo vivo.
      expect(refreshRepo.linhas.filter((l) => !l.revokedAt)).toHaveLength(0);
    });

    it('marca ACCOUNT_DISABLED ao derrubar a família de uma conta desativada', async () => {
      const inicial = await service.signin({
        email: usuario.email,
        pass: SENHA,
      });
      await service.refresh(inicial.refreshToken); // deixa um elo vivo na família
      usuario.isActive = false;

      // Segunda aba chega com o cookie antigo: passa pela tolerância e só então
      // esbarra na conta desativada — é aqui que sobra elo vivo para revogar.
      await expect(
        service.refresh(inicial.refreshToken),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(
        refreshRepo.linhas.some((l) => l.revokedReason === 'ACCOUNT_DISABLED'),
      ).toBe(true);
    });

    it('recusa token desconhecido', async () => {
      await expect(service.refresh('nunca-existiu')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('revoga a cadeia inteira, não só o token apresentado', async () => {
      const inicial = await service.signin({
        email: usuario.email,
        pass: SENHA,
      });
      const renovada = await service.refresh(inicial.refreshToken);

      await service.logout(renovada.refreshToken);

      expect(refreshRepo.linhas.every((l) => l.revokedAt)).toBe(true);
      expect(refreshRepo.linhas.at(-1)?.revokedReason).toBe('LOGOUT');
    });

    it('não explode com um cookie que o servidor não conhece', async () => {
      await expect(service.logout('cookie-velho')).resolves.toBeUndefined();
    });
  });
});
