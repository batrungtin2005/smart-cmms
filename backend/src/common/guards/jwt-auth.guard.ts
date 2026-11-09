import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Guard protecting private endpoints using JWT
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
