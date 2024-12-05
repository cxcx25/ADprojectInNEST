import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

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

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  searchUsers(username: string, domain: string): Observable<ADUser[]> {
    return this.http.get<ADUser[]>(`${this.apiUrl}/users/search/${domain}`, {
      params: { query: username }
    }).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An error occurred';
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else if (error.status === 0) {
      // Network error or backend not running
      errorMessage = 'Unable to connect to the server. Please ensure the backend service is running.';
    } else {
      // Backend error
      errorMessage = `Server returned code ${error.status}, error message: ${error.error?.message || 'Unknown error'}`;
    }
    console.error(errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}