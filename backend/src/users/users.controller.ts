import {
  Body,
  Controller,
  Get,
  HttpException,
  InternalServerErrorException,
  Param,
  ParseIntPipe,
  Patch,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserInfoDto } from './dto/create-user.dto';
import { AuthGuard } from '@nestjs/passport';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Put('update-info')
  @UseGuards(AuthGuard('jwt'))
  async updateUserInfo(
    @Body() userInfo: CreateUserInfoDto,
    @Req() request: any,
  ) {
    try {
      const user = request.user;
      const userId = user.userId;
      return await this.usersService.createUserInfo(userInfo, userId);
    } catch (error) {
      this.handleError(error);
    }
  }
  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  async getUser(@Req() request: any) {
    try {
      const user = request.user;
      const userId = user.userId;
      return await this.usersService.getCurrentUserProfile(userId);
    } catch (error) {
      this.handleError(error);
    }
  }

  @Patch('me')
  @UseGuards(AuthGuard('jwt'))
  async updateProfile(@Req() request: any, @Body() body: UpdateProfileDto) {
    try {
      const user = request.user;
      const userId = user.userId;
      return await this.usersService.updateCurrentUserProfile(userId, body);
    } catch (error) {
      this.handleError(error);
    }
  }

  @Patch('me/change-password')
  @UseGuards(AuthGuard('jwt'))
  async changePassword(@Req() request: any, @Body() body: ChangePasswordDto) {
    try {
      const user = request.user;
      const userId = user.userId;
      return await this.usersService.changePassword(userId, body);
    } catch (error) {
      this.handleError(error);
    }
  }
  @Get(':userId')
  async getUserById(@Param('userId', ParseIntPipe) userId: number) {
    try {
      return await this.usersService.getUserProfileById(userId);
    } catch (error) {
      this.handleError(error);
    }
  }
  private handleError(error: any): never {
    if (error instanceof HttpException) {
      throw error; // Re-throw HTTP exceptions
    }

    console.error('Unexpected error:', error); // Log unexpected errors
    throw new InternalServerErrorException('An unexpected error occurred');
  }
}
