import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { AuthService } from '../../core/services/auth.service';


interface ADUser {
  username: string;
  displayName: string;
  email: string;
  department: string;
  fullName: string;
  security: {
    isLocked: boolean;
    isDisabled: boolean;
    isPasswordExpired: boolean;
  };
  dates: {
    passwordLastSet: string;
    passwordExpiration: string;
    accountExpiration: string;
    lastModified: string;
  };
}

@Component({
  selector: 'app-user-search',
  templateUrl: './user-search.component.html',
  styleUrls: ['./user-search.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatSelectModule
  ]
})
export class UserSearchComponent {
  searchQuery: string = '';
  selectedDomain: string = 'lux';
  users: ADUser[] = [];
  loading = false;
  errorMessage: string | null = null;

  constructor(
    private authService: AuthService,
    private snackBar: MatSnackBar
  ) {}

  onSearch(): void {
    this.errorMessage = null;

    if (!this.searchQuery?.trim()) {
      this.errorMessage = 'Please enter a search term';
      return;
    }

    this.loading = true;
    this.users = [];

    this.authService.searchUsers(this.searchQuery.trim(), this.selectedDomain)
      .pipe(
        finalize(() => this.loading = false)
      )
      .subscribe({
        next: (users: ADUser[]) => {
          this.users = users;
          if (users.length === 0) {
            this.errorMessage = 'No users found';
          }
        },
        error: (error: Error) => {
          console.error('Search error:', error);
          this.errorMessage = 'An error occurred while searching. Please try again.';
          this.snackBar.open('Search failed. Please try again.', 'Close', {
            duration: 5000
          });
        }
      });
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.users = [];
    this.errorMessage = null;
  }

  isDateExpired(dateStr: string | null): boolean {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    return date < new Date();
  }
}