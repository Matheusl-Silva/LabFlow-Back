import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { Injectable } from "@nestjs/common";
import { JwtPayload } from "../types/jwt.payload.type";
import { Role } from "../enums/role.enum";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt'){
    constructor(config : ConfigService){
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            secretOrKey: config.getOrThrow<string>("JWT_SECRET")
        });
    }

    async validate(payload): Promise<JwtPayload>{
        // Compatibilidade com tokens emitidos ANTES dos papéis existirem: eles
        // só trazem `isAdmin`. Sem este fallback, quem estivesse logado no
        // momento do deploy levaria 403 até o token expirar (15 min). O
        // fallback do usuário comum reproduz o que ele já podia fazer.
        // Pode sair quando a Fase 6 remover `isAdmin` do payload.
        const roles: Role[] = Array.isArray(payload.roles)
            ? payload.roles
            : payload.isAdmin
              ? [Role.ADMIN]
              : [Role.EXAMS, Role.PATIENTS];

        return {
            id: payload.sub,
            isAdmin: roles.includes(Role.ADMIN),
            roles
        }
    }
}