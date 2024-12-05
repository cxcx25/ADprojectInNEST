import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as ActiveDirectory from 'activedirectory2';

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

@Injectable()
export class UsersService {
  private adClients: { [key: string]: ActiveDirectory };

  constructor(private configService: ConfigService) {
    const luxConfig = {
      url: this.configService.get<string>('LUX_AD_URL'),
      baseDN: this.configService.get<string>('LUX_BASE_DN'),
      username: this.configService.get<string>('LUX_USERNAME'),
      password: this.configService.get<string>('LUX_PASSWORD'),
    };

    const essilorConfig = {
      url: this.configService.get<string>('ESSILOR_AD_URL'),
      baseDN: this.configService.get<string>('ESSILOR_BASE_DN'),
      username: this.configService.get<string>('ESSILOR_USERNAME'),
      password: this.configService.get<string>('ESSILOR_PASSWORD'),
    };

    // Log config values to verify they're loaded
    console.log('LDAP Config Values:', {
      lux: {
        url: luxConfig.url,
        baseDN: luxConfig.baseDN,
        username: luxConfig.username,
      },
      essilor: {
        url: essilorConfig.url,
        baseDN: essilorConfig.baseDN,
        username: essilorConfig.username,
      }
    });

    if (!luxConfig.baseDN || !luxConfig.username || !luxConfig.password) {
      throw new Error('Missing required Lux LDAP configuration');
    }

    if (!essilorConfig.baseDN || !essilorConfig.username || !essilorConfig.password) {
      throw new Error('Missing required Essilor LDAP configuration');
    }

    this.adClients = {
      lux: new ActiveDirectory({
        url: luxConfig.url,
        baseDN: luxConfig.baseDN,
        username: luxConfig.username,
        password: luxConfig.password,
      }),
      essilor: new ActiveDirectory({
        url: essilorConfig.url,
        baseDN: essilorConfig.baseDN,
        username: essilorConfig.username,
        password: essilorConfig.password,
      }),
    };
  }

  async testConnection(domain: string): Promise<{ success: boolean; message: string }> {
    try {
      const client = this.adClients[domain.toLowerCase()];
      if (!client) {
        throw new Error('Invalid domain');
      }

      await new Promise((resolve, reject) => {
        client.findUser('', (err: Error, user: any) => {
          if (err) {
            reject(err);
          } else {
            resolve(user);
          }
        });
      });

      return { success: true, message: 'Connection successful' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async searchUsers(query: string, domain: string): Promise<ADUser[]> {
    const client = this.adClients[domain.toLowerCase()];
    if (!client) {
      throw new Error('Invalid domain');
    }

    // Get the config for logging
    const config = domain.toLowerCase() === 'lux' ? {
      url: this.configService.get<string>('LUX_AD_URL'),
      baseDN: this.configService.get<string>('LUX_BASE_DN'),
      username: this.configService.get<string>('LUX_USERNAME'),
    } : {
      url: this.configService.get<string>('ESSILOR_AD_URL'),
      baseDN: this.configService.get<string>('ESSILOR_BASE_DN'),
      username: this.configService.get<string>('ESSILOR_USERNAME'),
    };

    console.log('LDAP Search Config:', {
      domain,
      ...config
    });

    return new Promise((resolve, reject) => {
      // Exact match for sAMAccountName
      const searchQuery = `(&(objectClass=user)(sAMAccountName=${query}))`;
      console.log('LDAP Search Query:', searchQuery);

      const opts = {
        filter: searchQuery,
        scope: 'sub',
        attributes: [
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
          'msDS-UserPasswordExpiryTimeComputed'
        ]
      };

      client.findUsers(opts, (err: Error, users: any[]) => {
        if (err) {
          console.error('LDAP Search Error:', {
            message: err.message,
            stack: err.stack,
            code: (err as any).code,
            errno: (err as any).errno,
          });
          reject(err);
        } else {
          console.log('LDAP Search Results:', {
            found: users?.length || 0,
            firstUser: users?.[0] ? {
              sAMAccountName: users[0].sAMAccountName,
              displayName: users[0].displayName,
              dn: users[0].distinguishedName
            } : null
          });

          resolve(
            users?.map((user) => {
              const userAccountControl = parseInt(user.userAccountControl || '0');

              // Convert Windows FileTime to JavaScript Date
              // Windows FileTime is in 100-nanosecond intervals since January 1, 1601
              const windowsToJsDate = (windowsTime: string | undefined): Date | null => {
                if (!windowsTime || windowsTime === '0' || windowsTime === '9223372036854775807') return null;
                const windowsTimestamp = BigInt(windowsTime);
                const windowsToUnixEpochInNs = BigInt('116444736000000000'); // Difference between Windows epoch (1601-01-01) and Unix epoch (1970-01-01)
                const unixTimestampInMs = Number((windowsTimestamp - windowsToUnixEpochInNs) / BigInt(10000));
                return new Date(unixTimestampInMs);
              };

              const formatDate = (date: Date | null): string => {
                if (!date) return 'N/A';
                return date.toLocaleString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                });
              };

              const pwdLastSet = windowsToJsDate(user.pwdLastSet);
              const accountExpires = windowsToJsDate(user.accountExpires);
              const passwordExpiration = windowsToJsDate(user['msDS-UserPasswordExpiryTimeComputed']) ||
                (pwdLastSet ? new Date(pwdLastSet.getTime() + (90 * 24 * 60 * 60 * 1000)) : null);
              const lastModified = user.whenChanged
                ? new Date(
                  user.whenChanged.substring(0, 4),
                  parseInt(user.whenChanged.substring(4, 6)) - 1,
                  user.whenChanged.substring(6, 8),
                  user.whenChanged.substring(8, 10),
                  user.whenChanged.substring(10, 12),
                  user.whenChanged.substring(12, 14)
                )
                : null;

              return {
                username: user.sAMAccountName,
                displayName: user.displayName,
                email: user.mail,
                department: user.department || 'N/A',
                fullName: user.cn || user.displayName,
                status: userAccountControl === 512 ? 'active' : 'inactive',
                security: {
                  "Account Locked": user.lockoutTime && user.lockoutTime !== '0' ? 'Yes' : 'No',
                  "Account Disabled": (userAccountControl & 2) === 2 ? 'Yes' : 'No',
                  "Password Expired": ((userAccountControl & 8388608) === 8388608 ||
                    (passwordExpiration && passwordExpiration < new Date())) ? 'Yes' : 'No'
                },
                dates: {
                  passwordLastSet: formatDate(pwdLastSet),
                  passwordExpiration: formatDate(passwordExpiration),
                  accountExpiration: formatDate(accountExpires),
                  lastModified: formatDate(lastModified)
                }
              };
            }) || []
          );
        }
      });
    });
  }

  async findUser(username: string, domain: string): Promise<ADUser> {
    const client = this.adClients[domain.toLowerCase()];
    if (!client) {
      throw new Error('Invalid domain');
    }

    return new Promise((resolve, reject) => {
      client.findUser(username, (err: Error, user: any) => {
        if (err) {
          reject(err);
        } else if (!user) {
          reject(new Error('User not found'));
        } else {
          resolve({
            username: user.sAMAccountName,
            displayName: user.displayName,
            email: user.mail,
            department: user.department || 'N/A',
            fullName: user.cn || user.displayName,
            status: user.userAccountControl === '512' ? 'active' : 'inactive',
            security: {
              "Account Locked": 'No',
              "Account Disabled": 'No',
              "Password Expired": 'No'
            },
            dates: {
              passwordLastSet: 'N/A',
              passwordExpiration: 'N/A',
              accountExpiration: 'N/A',
              lastModified: 'N/A'
            }
          });
        }
      });
    });
  }
}