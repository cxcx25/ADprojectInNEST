import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ADUser, ADSearchFilters, ADUserRaw } from './interfaces/ad-user.interface';
import * as ActiveDirectory from 'activedirectory2';

@Injectable()
export class UsersService implements OnModuleInit {
  private adClients: { [key: string]: ActiveDirectory };

  constructor(private configService: ConfigService) {
    this.adClients = {};
  }

  onModuleInit() {
    try {
      // Initialize Luxottica AD client
      const luxConfig = {
        url: this.configService.get<string>('LUX_AD_URL'),
        baseDN: this.configService.get<string>('LUX_BASE_DN'),
        username: this.configService.get<string>('LUX_USERNAME'),
        password: this.configService.get<string>('LUX_PASSWORD'),
        attributes: {
          user: [
            'cn', 'displayName', 'mail', 'sAMAccountName', 'userPrincipalName',
            'whenCreated', 'whenChanged', 'pwdLastSet', 'accountExpires',
            'userAccountControl', 'department', 'distinguishedName', 'lockoutTime',
            'enabled'
          ]
        }
      };

      if (!luxConfig.url || !luxConfig.baseDN || !luxConfig.username || !luxConfig.password) {
        throw new Error('Missing required Luxottica AD configuration');
      }

      console.log('Initializing Luxottica AD client with config:', luxConfig);
      this.adClients['lux'] = new ActiveDirectory(luxConfig);
      console.log('Successfully initialized Luxottica AD client');

      // Initialize Essilor AD client
      const essilorConfig = {
        url: this.configService.get<string>('ESSILOR_AD_URL'),
        baseDN: this.configService.get<string>('ESSILOR_BASE_DN'),
        username: this.configService.get<string>('ESSILOR_USERNAME'),
        password: this.configService.get<string>('ESSILOR_PASSWORD'),
        attributes: {
          user: [
            'cn', 'displayName', 'mail', 'sAMAccountName', 'userPrincipalName',
            'whenCreated', 'whenChanged', 'pwdLastSet', 'accountExpires',
            'userAccountControl', 'department', 'distinguishedName', 'lockoutTime',
            'enabled'
          ]
        }
      };

      if (!essilorConfig.url || !essilorConfig.baseDN || !essilorConfig.username || !essilorConfig.password) {
        throw new Error('Missing required Essilor AD configuration');
      }

      console.log('Initializing Essilor AD client with config:', essilorConfig);
      this.adClients['essilor'] = new ActiveDirectory(essilorConfig);
      console.log('Successfully initialized Essilor AD client');
    } catch (error) {
      console.error('Failed to initialize AD clients:', error);
      throw error;
    }
  }

  async searchUsers(query: string, domain: string = 'lux'): Promise<ADUser[]> {
    const client = this.adClients[domain.toLowerCase()];
    if (!client) {
      throw new Error(`AD client not initialized for domain: ${domain}`);
    }

    // Validate and sanitize query
    if (!query || query.length < 2) {
      console.warn(`[SearchUsers] Invalid query: ${query}`);
      return [];
    }

    // Optimize search query to be more specific
    const sanitizedQuery = query.replace(/[^a-zA-Z0-9]/g, '');
    const upperQuery = sanitizedQuery.toUpperCase();

    console.log(`[SearchUsers] Searching with sanitized query: ${upperQuery}, domain: ${domain}`);

    // Prioritize exact matches and limit results
    const searchQueries = [
      `(&(objectClass=user)(sAMAccountName=${upperQuery}))`, // Exact username match
      `(&(objectClass=user)(|(sAMAccountName=*${upperQuery}*)(displayName=*${upperQuery}*)))` // Simplified broader match
    ];

    const searchWithTimeout = (filter: string, timeout: number = 40000): Promise<any[]> => { // Increased to 40 seconds
      console.log(`[SearchUsers] Starting search for filter: ${filter}`);
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          console.warn(`[SearchUsers] Search timeout after ${timeout}ms for filter: ${filter}`);
          reject(new Error(`Search timeout after ${timeout}ms`));
        }, timeout);

        // Increase size limit and add more detailed logging
        const searchOptions = {
          filter: filter,
          scope: 'sub',
          attributes: [
            'sAMAccountName', 'displayName', 'mail', 'department', 
            'userAccountControl', 'distinguishedName', 'cn',
            'whenCreated', 'whenChanged', 'pwdLastSet', 'accountExpires',
            'lockoutTime'
          ],
          sizeLimit: 50, // Increased from 10 to 50
          paged: true,
          timeLimit: 15 // Increased time limit to 15 seconds
        };

        const startTime = Date.now();
        client.find(searchOptions, (err, results) => {
          clearTimeout(timer);
          
          if (err) {
            console.error(`[SearchUsers] AD Search Error for query ${filter}:`, err);
            reject(err);
          } else {
            const endTime = Date.now();
            console.log(`[SearchUsers] Search completed in ${endTime - startTime}ms`);
            console.log(`[SearchUsers] Found ${results?.length || 0} results for filter: ${filter}`);
            console.log(`Search completed with result: ${JSON.stringify(results)}`);
            resolve(results || []);
          }
        });
      });
    };

    try {
      // Try exact match first with shorter timeout
      const exactResults = await searchWithTimeout(searchQueries[0], 3000);
      if (exactResults.length > 0) {
        console.log(`[SearchUsers] Exact match found: ${exactResults.length} users`);
        return this.mapADResults(exactResults);
      }

      // If no exact match, try broader search
      const broaderResults = await searchWithTimeout(searchQueries[1], 20000);
      return this.mapADResults(broaderResults);
    } catch (error) {
      console.error(`[SearchUsers] Complete search failure for query ${query} in ${domain}:`, error);
      
      // Provide more detailed error context
      const errorContext = {
        query,
        domain,
        sanitizedQuery: upperQuery,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
      
      // You might want to log this to a file or error tracking system
      console.error('Search Error Context:', JSON.stringify(errorContext, null, 2));
      
      throw new Error(`Search failed: ${errorContext.errorMessage}`);
    }
  }

  private mapADResults(results: any[]): ADUser[] {
    return results.map(user => {
      const userAccountControl = parseInt(user.userAccountControl || '0');
      const pwdLastSet = this.windowsToJsDate(user.pwdLastSet);
      const accountExpires = this.windowsToJsDate(user.accountExpires);
      const whenCreated = user.whenCreated ? new Date(user.whenCreated) : null;
      const whenChanged = user.whenChanged ? new Date(user.whenChanged) : null;

      return {
        displayName: user.displayName || user.cn || '',
        samAccountName: user.sAMAccountName || '',
        name: user.cn || user.displayName || '',
        email: user.mail || '',
        department: user.department || '',
        userPrincipalName: user.userPrincipalName || '',
        distinguishedName: user.distinguishedName || '',
        whenCreated: whenCreated,
        whenChanged: whenChanged,
        status: {
          isLocked: user.lockoutTime && user.lockoutTime !== '0',
          isDisabled: (userAccountControl & 2) === 2,
          passwordExpired: (userAccountControl & 8388608) === 8388608
        },
        passwordLastSet: this.formatDate(pwdLastSet),
        passwordExpirationDate: null, // You might want to implement actual password expiration logic
        accountExpirationDate: this.formatDate(accountExpires)
      };
    }).filter(user => user.displayName); // Filter out invalid entries
  }

  private windowsToJsDate(windowsTimestamp: string | undefined): Date | null {
    if (!windowsTimestamp) return null;
    const timestamp = parseInt(windowsTimestamp);
    if (isNaN(timestamp) || timestamp === 0) return null;
    
    // Windows FILETIME is 100-nanosecond intervals since January 1, 1601
    const windowsEpoch = Date.parse('1601-01-01');
    return new Date(windowsEpoch + timestamp / 10000);
  }

  private formatDate(date: Date | null): string | null {
    return date ? date.toISOString().split('T')[0] : null;
  }

  async searchADUser(domain: string, filters: ADSearchFilters): Promise<ADUser[]> {
    const ad = this.adClients[domain.toLowerCase()];
    if (!ad) {
      throw new Error(`Invalid domain: ${domain}`);
    }

    const filter = this.buildADFilter(filters);

    return new Promise((resolve, reject) => {
      ad.find(filter, (err, results) => {
        if (err) {
          console.error('AD Search Error:', err);
          reject(err);
        } else {
          const users = Array.isArray(results) ? results : results ? [results] : [];
          resolve(this.mapADUsers(users));
        }
      });
    });
  }

  private buildADFilter(filters: ADSearchFilters): string {
    const filterParts: string[] = [];

    if (filters.name) filterParts.push(`(cn=*${filters.name}*)`);
    if (filters.employeeId) filterParts.push(`(employeeID=*${filters.employeeId}*)`);
    if (filters.email) filterParts.push(`(mail=*${filters.email}*)`);
    if (filters.department) filterParts.push(`(department=*${filters.department}*)`);

    return filterParts.length > 0 ? `(&(objectClass=user)(|${filterParts.join('')}))` : '(objectClass=user)';
  }

  private mapADUsers(users: any[]): ADUser[] {
    return users.map((user) => {
      const userAccountControl = parseInt(user.userAccountControl || '0');
      const pwdLastSet = this.windowsToJsDate(user.pwdLastSet);
      const accountExpires = this.windowsToJsDate(user.accountExpires);
      const passwordExpiration = this.windowsToJsDate(user['msDS-UserPasswordExpiryTimeComputed']) ||
        (pwdLastSet ? new Date(pwdLastSet.getTime() + (90 * 24 * 60 * 60 * 1000)) : null);
      const lastModified = user.whenChanged ? new Date(user.whenChanged) : null;
      const whenCreated = this.windowsToJsDate(user.whenCreated);
      const whenChanged = this.windowsToJsDate(user.whenChanged);

      return {
        displayName: user.displayName || '',
        samAccountName: user.sAMAccountName || '',
        name: user.displayName || '',
        email: user.mail || '',
        userPrincipalName: user.userPrincipalName || '',
        distinguishedName: user.distinguishedName || '',
        department: user.department || '',
        status: {
          isLocked: user.lockoutTime && user.lockoutTime !== '0',
          isDisabled: (userAccountControl & 2) === 2,
          passwordExpired: (userAccountControl & 8388608) === 8388608
        },
        whenCreated: whenCreated,
        whenChanged: whenChanged,
        passwordLastSet: this.formatDate(pwdLastSet),
        passwordExpirationDate: this.formatDate(passwordExpiration),
        accountExpirationDate: this.formatDate(accountExpires),
        username: user.sAMAccountName || '',
        fullName: user.cn || '',
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
  }

  async resetPassword(username: string, domain: string, newPassword: string): Promise<void> {
    const ad = this.adClients[domain.toLowerCase()];
    if (!ad) {
      throw new Error(`Invalid domain: ${domain}`);
    }

    return new Promise((resolve, reject) => {
      ad.setUserPassword(username, newPassword, (err) => {
        if (err) {
          console.error('Password reset error:', err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  async unlockAccount(username: string, domain: string): Promise<void> {
    const ad = this.adClients[domain.toLowerCase()];
    if (!ad) {
      throw new Error(`Invalid domain: ${domain}`);
    }

    return new Promise((resolve, reject) => {
      ad.unlockUser(username, (err) => {
        if (err) {
          console.error('Account unlock error:', err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  async updateAccountExpiration(username: string, domain: string, expirationDate: Date): Promise<void> {
    const ad = this.adClients[domain.toLowerCase()];
    if (!ad) {
      throw new Error(`Invalid domain: ${domain}`);
    }

    return new Promise((resolve, reject) => {
      const timestamp = (expirationDate.getTime() * 10000) + 116444736000000000;
      ad.setUserProperty(username, 'accountExpires', timestamp.toString(), (err) => {
        if (err) {
          console.error('Account expiration update error:', err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}