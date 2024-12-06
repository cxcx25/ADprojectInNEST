import { Controller, Get, Post, Body, Query, Param } from '@nestjs/common';
import { UsersService, ADUser } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('health/:domain')
  async healthCheck(@Param('domain') domain: string): Promise<{ success: boolean; message: string }> {
    return this.usersService.testConnection(domain);
  }

  @Get('search/:domain')
  async searchUsers(
    @Param('domain') domain: string,
    @Query('query') query: string,
  ): Promise<ADUser[]> {
    if (!query) {
      throw new Error('Query parameter is required');
    }
    return this.usersService.searchUsers(query, domain);
  }

  @Get(':domain/:username')
  async findUser(
    @Param('domain') domain: string,
    @Param('username') username: string,
  ): Promise<ADUser> {
    return this.usersService.findUser(username, domain);
  }
}