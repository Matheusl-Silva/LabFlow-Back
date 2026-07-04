import { ExecutionContext, ForbiddenException, UnauthorizedException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthGuard } from "@nestjs/passport";
import { Observable } from "rxjs";
import { IS_PUBLIC_KEY } from "../decorators/is-public.decorator";
import { ALLOW_COMMON_USER_KEY } from "../decorators/allow-common-user.decorator";

@Injectable()
export class AdminGuard extends AuthGuard('jwt'){
    constructor(private reflector: Reflector){
        super();
    }

    canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass()
        ]);

        if(isPublic) return true;

        const allowCommonUser = this.reflector.getAllAndOverride<boolean>(ALLOW_COMMON_USER_KEY, [
            context.getHandler(),
            context.getClass()
        ]);

        if(allowCommonUser){
            const { user } = context.switchToHttp().getRequest();
            if(!user) throw new UnauthorizedException();
            return true;
        }

        const { user } = context.switchToHttp().getRequest();
        if(!user.isAdmin) throw new ForbiddenException();

        return true;
    }
}