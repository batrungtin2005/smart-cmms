import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

// Set allowed roles for route handler
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
