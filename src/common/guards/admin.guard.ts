import { CanActivate, ExecutionContext, ForbiddenException, UnauthorizedException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "../decorators/is-public.decorator";
import { ALLOW_COMMON_USER_KEY } from "../decorators/allow-common-user.decorator";

// Guard de autorização puro: assume que o JwtGuard (registrado antes) já
// autenticou e populou request.user. Não herda mais de AuthGuard('jwt') — a
// herança era inócua (super.canActivate nunca era chamado). A checagem de
// `user` logo no início faz o guard falhar FECHADO (401) caso a ordem dos
// guards mude e ele rode antes da autenticação, em vez de estourar TypeError.
@Injectable()
export class AdminGuard implements CanActivate {
    constructor(private reflector: Reflector){}

    canActivate(context: ExecutionContext): boolean {
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass()
        ]);

        if(isPublic) return true;

        const { user } = context.switchToHttp().getRequest();
        if(!user) throw new UnauthorizedException();

        const allowCommonUser = this.reflector.getAllAndOverride<boolean>(ALLOW_COMMON_USER_KEY, [
            context.getHandler(),
            context.getClass()
        ]);

        if(allowCommonUser) return true;

        if(!user.isAdmin) throw new ForbiddenException();

        return true;
    }
}