import { Controller, Get, Post, Body, Query, Param, HttpException, HttpStatus } from '@nestjs/common';
import { UsersService } from './users.service';
import { ADUser } from './interfaces/ad-user.interface';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('search')
  async searchUsers(
    @Query('query') query: string,
    @Query('domain') domain: string = 'lux'
  ): Promise<ADUser[]> {
    try {
      console.log(`[Controller] Searching users with query: ${query}, domain: ${domain}`);
      if (domain === 'all') {
        // Search both domains in parallel
        const [luxResults, essilorResults] = await Promise.all([
          this.usersService.searchUsers(query, 'lux'),
          this.usersService.searchUsers(query, 'essilor')
        ]);
        const results = [...luxResults, ...essilorResults];
        console.log(`[Controller] Found ${results.length} total users`);
        return results;
      }
      const results = await this.usersService.searchUsers(query, domain);
      console.log(`[Controller] Found ${results.length} users in ${domain} domain`);
      if (results.length === 0) {
        console.warn(`[Controller] No users found for query: ${query}`);
        throw new HttpException('No users found', HttpStatus.NOT_FOUND);
      }
      return results;
    } catch (error) {
      console.error('[Controller] Search error:', error);
      if (error.message.includes('timeout')) {
        throw new HttpException('Search timeout occurred', HttpStatus.REQUEST_TIMEOUT);
      }
      throw new HttpException('Failed to search users', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('advanced-search')
  async advancedSearch(
    @Query('name') name: string,
    @Query('employeeId') employeeId?: string,
    @Query('email') email?: string,
    @Query('department') department?: string
  ): Promise<ADUser[]> {
    return this.usersService.searchADUser('lux', { name, employeeId, email, department });
  }

  @Post('reset-password')
  async resetPassword(
    @Body('username') username: string,
    @Body('domain') domain: string,
    @Body('newPassword') newPassword: string
  ) {
    return this.usersService.resetPassword(username, domain, newPassword);
  }

  @Post('unlock-account')
  async unlockAccount(
    @Body('username') username: string,
    @Body('domain') domain: string
  ) {
    return this.usersService.unlockAccount(username, domain);
  }

  @Post(':domain/:username/expiration')
  async updateAccountExpiration(
    @Param('domain') domain: string,
    @Param('username') username: string,
    @Body('expirationDate') expirationDate: string
  ): Promise<void> {
    return this.usersService.updateAccountExpiration(username, domain, new Date(expirationDate));
  }
}