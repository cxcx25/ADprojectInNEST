import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as ActiveDirectory from 'activedirectory2';
import { clear } from 'console';

export interface ADUser {
  username: string;
  displayName: string;
  email: string;
  department: string;
  fullName: string;
  status: string;
  security: {
    "Account Locked": string;
    "Account Disabled": string;
    "Password Expired": string;
  };
  dates: {
    passwordLastSet: string;
    passwordExpiration: string;
    accountExpiration: string;
    lastModified: string;
  };
}

const userAttributes = [
  'sAMAccountName',
  'displayName',
  'mail',
  'department',
  'userAccountControl',
  'distinguishedName',
  'cn',
  'pwdLastSet',
  'accountExpires',
  'whenChanged',
  'lockoutTime',
  'msDS-UserPasswordExpiryTimeComputed',
  'thumbnailPhoto'
];

@Injectable()
export class UsersService {
  private adClients: { [key: string]: ActiveDirectory };

  constructor(private configService: ConfigService) {
    this.adClients = {};
  }

  private initializeADClient(domain: string): ActiveDirectory {
    const config = {
      url: this.configService.get(`${domain.toUpperCase()}_AD_URL`),
      baseDN: this.configService.get(`${domain.toUpperCase()}_BASE_DN`),
      username: this.configService.get(`${domain.toUpperCase()}_USERNAME`),
      password: this.configService.get(`${domain.toUpperCase()}_PASSWORD`)
    };

    if (!config.url || !config.baseDN) {
      throw new Error(`Missing required ${domain.toUpperCase()} AD configuration`);
    }

    // Log minimal configuration info
    console.log(`[${domain.toUpperCase()}] Initializing AD client with:`, {
      url: config.url,
      baseDN: config.baseDN,
      username: config.username ? '(provided)' : '(anonymous)'
    });

    // If credentials are not provided, try anonymous bind
    return new ActiveDirectory({
      url: config.url,
      baseDN: config.baseDN,
      username: config.username || '',  // empty string for anonymous bind
      password: config.password || '',  // empty string for anonymous bind
      attributes: {
        user: userAttributes,
        group: ['*']
      }
    });
  }

  async onModuleInit() {
    try {
      // Initialize AD clients for both domains
      this.adClients = {
        lux: this.initializeADClient('lux'),
        essilor: this.initializeADClient('essilor')
      };

      // Test connections
      await this.testConnection('lux');
      await this.testConnection('essilor');

      console.log('AD clients initialized and tested successfully');
    } catch (error) {
      console.error('Failed to initialize AD clients:', error.message);
      throw error;
    }
  }

  private windowsToJsDate(windowsTime: string | undefined): Date | null {
    if (!windowsTime || windowsTime === '0' || windowsTime === '9223372036854775807') return null;
    const windowsTimestamp = BigInt(windowsTime);
    const windowsToUnixEpochInNs = BigInt('116444736000000000');
    const unixTimestampInMs = Number((windowsTimestamp - windowsToUnixEpochInNs) / BigInt(10000));
    return new Date(unixTimestampInMs);
  }

  private formatDate(date: Date | null): string {
    if (!date) return 'N/A';
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  async testConnection(domain: string): Promise<{ success: boolean; message: string }> {
    const client = this.adClients[domain.toLowerCase()];
    if (!client) {
      return { success: false, message: 'Invalid domain' };
    }

    try {
      console.log(`[${domain.toUpperCase()}] Testing connection...`);
      
      // Try a search instead of authentication to test connection
      const result = await new Promise<boolean>((resolve, reject) => {
        const testQuery = '(&(objectClass=user)(cn=*))';
        const opts = {
          filter: testQuery,
          scope: 'sub',
          sizeLimit: 1
        };

        client.find(opts, (err: any) => {
          if (err) {
            const errorMessage = err.message || err.lde_message || 'Connection test failed';
            console.error(`[${domain.toUpperCase()}] Connection test failed:`, {
              message: errorMessage,
              code: err.code
            });
            reject(new Error(errorMessage));
          } else {
            console.log(`[${domain.toUpperCase()}] Connection test successful`);
            resolve(true);
          }
        });
      });

      return { success: true, message: 'Connection successful' };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      const message = `Connection failed: ${errorMessage}`;
      console.error(`[${domain.toUpperCase()}] ${message}`);
      return { success: false, message }; // Return error instead of throwing
    }
  }

  async searchUsers(query: string, domain: string): Promise<ADUser[]> {
    const client = this.adClients[domain.toLowerCase()];
    if (!client) {
      throw new Error('Invalid domain');
    }

    try {
      const result = await new Promise<any[]>((resolve, reject) => {
        const upperQuery = query.toUpperCase();
        const searchQuery = `(&(objectClass=user)(|(cn=${upperQuery})(sAMAccountName=${upperQuery})(distinguishedName=*${upperQuery}*)))`;
        
        const opts = {
          filter: searchQuery,
          scope: 'sub',
          attributes: userAttributes,
          sizeLimit: 10,
          timeLimit: 30
        };

        console.log(`[${domain.toUpperCase()}] Searching for: ${query}`);

        client.findUsers(opts, (err: any, users: any[]) => {
          if (err) {
            const errorMessage = err.message || err.lde_message || 'Search failed';
            console.error(`[${domain.toUpperCase()}] Search Error:`, {
              message: errorMessage,
              code: err.code
            });
            reject(new Error(errorMessage));
            return;
          }

          console.log(`[${domain.toUpperCase()}] Found ${users?.length || 0} users`);
          resolve(users || []);
        });
      });

      return result.map((user) => {
        const userAccountControl = parseInt(user.userAccountControl || '0');
        const pwdLastSet = this.windowsToJsDate(user.pwdLastSet);
        const accountExpires = this.windowsToJsDate(user.accountExpires);
        const passwordExpiration = this.windowsToJsDate(user['msDS-UserPasswordExpiryTimeComputed']) ||
          (pwdLastSet ? new Date(pwdLastSet.getTime() + (90 * 24 * 60 * 60 * 1000)) : null);
        const lastModified = user.whenChanged ? new Date(user.whenChanged) : null;

        return {
          username: user.sAMAccountName || '',
          displayName: user.displayName || '',
          email: user.mail || '',
          department: user.department || '',
          fullName: user.cn || '',
          status: 'Active',
          security: {
            "Account Locked": user.lockoutTime && user.lockoutTime !== '0' ? 'Yes' : 'No',
            "Account Disabled": (userAccountControl & 2) === 2 ? 'Yes' : 'No',
            "Password Expired": (userAccountControl & 8388608) === 8388608 ? 'Yes' : 'No'
          },
          dates: {
            passwordLastSet: this.formatDate(pwdLastSet),
            passwordExpiration: this.formatDate(passwordExpiration),
            accountExpiration: this.formatDate(accountExpires),
            lastModified: this.formatDate(lastModified)
          }
        };
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error(`[${domain.toUpperCase()}] Search failed:`, {
        message: errorMessage
      });
      throw new Error(`Search failed: ${errorMessage}`);
    }
  }

  async findUser(username: string, domain: string): Promise<ADUser> {
    const users = await this.searchUsers(username, domain);
    if (!users || users.length === 0) {
      throw new Error('User not found');
    }
    return users[0];
  }
}