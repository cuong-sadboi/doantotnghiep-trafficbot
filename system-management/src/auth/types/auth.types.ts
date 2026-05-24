import type { UserProvider } from '../../users/entities/user.entity';

export type AuthProvider = UserProvider;

export interface JwtUserPayload {
  sub: string;
  email: string;
  name: string;
  provider: AuthProvider;
}

export interface RequestUser {
  userId: string;
  email: string;
  name: string;
  provider: AuthProvider;
}

export interface PublicUser {
  id: string;
  name: string;
  age: number;
  email: string;
  isActive: boolean;
  provider: AuthProvider;
  avatar?: string;
  createdAt?: Date;
  updatedAt?: Date;
}