import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import type { StringValue } from 'ms';
import { User, UserProvider } from '../users/entities/user.entity';
import { GoogleLoginDto } from './dto/google-login.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtUserPayload, PublicUser } from './types/auth.types';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto) {
    this.validateRegisterPayload(registerDto);

    const email = registerDto.email.trim().toLowerCase();
    const existed = await this.userRepository.findOne({ where: { email } });
    if (existed) {
      throw new ConflictException('Email already exists');
    }

    const passwordHash = await bcrypt.hash(registerDto.password, 10);

    try {
      const created = await this.userRepository.save({
        name: registerDto.name.trim(),
        email,
        age: registerDto.age ?? 0,
        passwordHash,
        provider: UserProvider.LOCAL,
        isActive: true,
      });

      return this.createAuthResponse(created);
    } catch (error: unknown) {
      this.handleMySqlConflict(error);
      throw error;
    }
  }

  async login(loginDto: LoginDto) {
    this.validateLoginPayload(loginDto);

    const email = loginDto.email.trim().toLowerCase();

    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email })
      .getOne();

    if (!user?.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(loginDto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.createAuthResponse(user);
  }

  async loginWithGoogle(dto: GoogleLoginDto) {
    if (!dto.idToken?.trim()) {
      throw new BadRequestException('idToken is required');
    }

    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    if (!clientId) {
      throw new BadRequestException('GOOGLE_CLIENT_ID is not configured on server');
    }

    let ticketPayload: {
      sub?: string;
      email?: string;
      email_verified?: boolean;
      name?: string;
      picture?: string;
    };

    try {
      const oauthClient = new OAuth2Client(clientId);
      const ticket = await oauthClient.verifyIdToken({
        idToken: dto.idToken,
        audience: clientId,
      });
      ticketPayload = ticket.getPayload() ?? {};
    } catch {
      throw new UnauthorizedException('Invalid Google token');
    }

    if (!ticketPayload.sub || !ticketPayload.email || !ticketPayload.email_verified) {
      throw new UnauthorizedException('Google account email is not verified');
    }

    const email = ticketPayload.email.toLowerCase();
    const googleId = ticketPayload.sub;
    const name = ticketPayload.name?.trim() || email.split('@')[0] || 'Google User';
    const picture = ticketPayload.picture;

    let user = await this.userRepository.findOne({
      where: [{ googleId }, { email }],
    });

    if (!user) {
      user = await this.userRepository.save({
        name,
        email,
        age: 0,
        provider: UserProvider.GOOGLE,
        googleId,
        avatar: picture,
        isActive: true,
      });

      return this.createAuthResponse(user);
    }

    const updates: Partial<User> = {};

    if (!user.googleId) {
      updates.googleId = googleId;
    }
    if (user.provider !== UserProvider.GOOGLE) {
      updates.provider = UserProvider.GOOGLE;
    }
    if (picture && picture !== user.avatar) {
      updates.avatar = picture;
    }
    if (name && name !== user.name) {
      updates.name = name;
    }

    if (Object.keys(updates).length > 0) {
      user = await this.userRepository.save({ ...user, ...updates });
    }

    return this.createAuthResponse(user);
  }

  async me(userId: string) {
    this.assertUuid(userId);

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.toPublicUser(user);
  }

  async dashboard(userId: string) {
    const user = await this.me(userId);

    return {
      profile: user,
      widgets: {
        accountAgeDays: user.createdAt
          ? Math.max(
              0,
              Math.floor(
                (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24),
              ),
            )
          : 0,
        authProvider: user.provider,
        profileCompletion: this.calculateProfileCompletion(user),
      },
    };
  }

  private calculateProfileCompletion(user: PublicUser) {
    let score = 50;
    if (user.age > 0) {
      score += 20;
    }
    if (user.avatar) {
      score += 30;
    }
    return score;
  }

  private validateRegisterPayload(dto: RegisterDto) {
    if (!dto.name?.trim()) {
      throw new BadRequestException('name is required');
    }
    if (!dto.email?.trim()) {
      throw new BadRequestException('email is required');
    }
    if (!dto.password || dto.password.length < 6) {
      throw new BadRequestException('password must be at least 6 characters');
    }
    if (
      dto.age !== undefined &&
      (typeof dto.age !== 'number' || Number.isNaN(dto.age) || dto.age < 0)
    ) {
      throw new BadRequestException('age must be a positive number');
    }
  }

  private validateLoginPayload(dto: LoginDto) {
    if (!dto.email?.trim()) {
      throw new BadRequestException('email is required');
    }
    if (!dto.password) {
      throw new BadRequestException('password is required');
    }
  }

  private assertUuid(id: string) {
    if (!UUID_REGEX.test(id)) {
      throw new BadRequestException('Invalid user id');
    }
  }

  private async createAuthResponse(user: User) {
    const publicUser = this.toPublicUser(user);
    const payload: JwtUserPayload = {
      sub: publicUser.id,
      email: publicUser.email,
      name: publicUser.name,
      provider: publicUser.provider,
    };

    return {
      accessToken: await this.jwtService.signAsync(payload, {
        expiresIn: this.jwtExpiresIn as StringValue,
      }),
      user: publicUser,
    };
  }

  private get jwtExpiresIn() {
    return this.configService.get<string>('JWT_EXPIRES_IN') ?? '7d';
  }

  private toPublicUser(user: User): PublicUser {
    return {
      id: user.id,
      name: user.name,
      age: user.age ?? 0,
      email: user.email,
      isActive: user.isActive ?? true,
      provider: user.provider ?? UserProvider.LOCAL,
      avatar: user.avatar ?? undefined,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private handleMySqlConflict(error: unknown): never | void {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === 'ER_DUP_ENTRY'
    ) {
      throw new ConflictException('Email already exists');
    }
  }
}
