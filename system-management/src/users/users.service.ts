import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto) {
    this.validateCreatePayload(createUserDto);

    const created = this.userRepository.create({
      name: createUserDto.name.trim(),
      age: createUserDto.age ?? 0,
      email: createUserDto.email.trim().toLowerCase(),
      isActive: createUserDto.isActive ?? true,
    });

    return this.userRepository.save(created);
  }

  async findAll() {
    return this.userRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string) {
    this.assertUuid(id);

    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    this.assertUuid(id);
    this.validateUpdatePayload(updateUserDto);

    const payload: UpdateUserDto = { ...updateUserDto };
    if (payload.name) {
      payload.name = payload.name.trim();
    }
    if (payload.email) {
      payload.email = payload.email.trim().toLowerCase();
    }

    const existing = await this.userRepository.findOne({ where: { id } });
    if (!existing) {
      throw new NotFoundException('User not found');
    }

    return this.userRepository.save({ ...existing, ...payload });
  }

  async remove(id: string) {
    this.assertUuid(id);

    const deleted = await this.userRepository.delete({ id });
    if (!deleted.affected) {
      throw new NotFoundException('User not found');
    }

    return {
      deleted: true,
      id,
    };
  }

  private assertUuid(id: string) {
    if (!UUID_REGEX.test(id)) {
      throw new BadRequestException('Invalid user id');
    }
  }

  private validateCreatePayload(dto: CreateUserDto) {
    if (!dto.name?.trim()) {
      throw new BadRequestException('name is required');
    }

    if (
      dto.age !== undefined &&
      (typeof dto.age !== 'number' || Number.isNaN(dto.age))
    ) {
      throw new BadRequestException('age must be a number');
    }

    if (!dto.email?.trim()) {
      throw new BadRequestException('email is required');
    }
  }

  private validateUpdatePayload(dto: UpdateUserDto) {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('update payload is empty');
    }

    if (dto.name !== undefined && !dto.name.trim()) {
      throw new BadRequestException('name cannot be empty');
    }

    if (
      dto.age !== undefined &&
      (typeof dto.age !== 'number' || Number.isNaN(dto.age))
    ) {
      throw new BadRequestException('age must be a number');
    }

    if (dto.email !== undefined && !dto.email.trim()) {
      throw new BadRequestException('email cannot be empty');
    }
  }
}
