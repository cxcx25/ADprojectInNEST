import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';


export interface ADUser {
  username: string;
  displayName: string;
  email: string;
  department?: string;
  security?: {
    'Account Locked': string;
    'Account Disabled': string;
    'Password Expired': string;
  };
  dates?: {
    passwordLastSet: string;
    accountExpiration: string;
    lastModified: string;
  };
}

export interface ADSearchFilters {
  employeeID?: string;
  name?: string;
  email?: string;
  department?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = '/api';  // Keep as relative URL for proxy to work

  constructor(private http: HttpClient) {}

  searchUsers(username: string, domain: string): Observable<ADUser[]> {
    const url = `${this.apiUrl}/users/search`;
    return this.http.get<ADUser[]>(url, { 
      params: { 
        query: username,
        domain: domain.toLowerCase()
      } 
    }).pipe(catchError(this.handleError));
  }

  advancedSearch(domain: string, filters: ADSearchFilters): Observable<ADUser[]> {
    const url = `${this.apiUrl}/users/advanced-search/${domain.toLowerCase()}`;
    return this.http.get<ADUser[]>(url, { params: filters as any })
      .pipe(catchError(this.handleError));
  }

  // Account management operations
  unlockAccount(username: string, domain: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/users/${domain}/${username}/unlock`, {})
      .pipe(catchError(this.handleError));
  }

  resetPassword(username: string, domain: string, newPassword: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/users/${domain}/${username}/reset-password`, { newPassword })
      .pipe(catchError(this.handleError));
  }

  updateExpiration(username: string, domain: string, expirationDate: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/users/${domain}/${username}/update-expiration`, { expirationDate })
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An error occurred';
    if (error.error instanceof ErrorEvent) {
      errorMessage = error.error.message;
    } else {
      errorMessage = error.error?.message || `Error Code: ${error.status}\nMessage: ${error.message}`;
    }
    return throwError(() => new Error(errorMessage));
  }
}