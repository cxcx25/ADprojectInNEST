export interface ADUser {
  displayName: string;
  samAccountName: string;
  name: string;
  email: string;
  department: string;
  userPrincipalName: string;
  distinguishedName: string;
  whenCreated: Date | null;
  whenChanged: Date | null;
  status: {
    isLocked: boolean;
    isDisabled: boolean;
    passwordExpired: boolean;
  };
  passwordLastSet: string | null;
  passwordExpirationDate: string | null;
  accountExpirationDate: string | null;
}

export interface ADSearchFilters {
  name?: string;
  employeeId?: string;
  email?: string;
  department?: string;
}

export interface ADUserRaw {
  displayName?: string;
  sAMAccountName?: string;
  cn?: string;
  mail?: string;
  department?: string;
  userPrincipalName?: string;
  distinguishedName?: string;
  whenCreated?: string;
  whenChanged?: string;
  lockoutTime?: string;
  userAccountControl?: string;
  pwdLastSet?: string;
  accountExpires?: string;
}
