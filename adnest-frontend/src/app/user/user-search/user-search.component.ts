import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService, ADUser } from '../../core/services/auth.service';
import { finalize } from 'rxjs/operators';

/**
 * User Search Component
 * 
 * Updates:
 * - Added support for new security status format (Account Locked, Account Disabled, Password Expired)
 * - Improved error handling and loading states
 * - Added clear search functionality
 * - TODO: Test with actual locked/disabled accounts when available
 */
@Component({
  selector: 'app-user-search',
  templateUrl: './user-search.component.html',
  styleUrls: ['./user-search.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ]
})
export class UserSearchComponent {
  searchQuery = '';
  selectedDomain = 'lux';
  loading = false;
  errorMessage = '';
  users: ADUser[] = [];

  constructor(
    private authService: AuthService,
    private snackBar: MatSnackBar
  ) {}

  getSecurityStatus(user: ADUser) {
    if (!user.security) return [];
    return Object.entries(user.security).map(([key, value]) => ({
      key,
      value: value
    }));
  }

  isDateExpired(dateStr: string): boolean {
    if (!dateStr || dateStr === 'N/A') return false;
    const date = new Date(dateStr);
    return date < new Date();
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.users = [];
    this.errorMessage = '';
  }

  onSearch() {
    if (!this.searchQuery) {
      this.errorMessage = 'Please enter a search term';
      return;
    }

    this.loading = true;
    this.users = [];
    this.errorMessage = '';

    this.authService.searchUsers(this.searchQuery.trim(), this.selectedDomain)
      .pipe(
        finalize(() => this.loading = false)
      )
      .subscribe({
        next: (users) => {
          this.users = users;
          if (users.length === 0) {
            this.errorMessage = 'No users found';
          }
        },
        error: (error) => {
          console.error('Search failed:', error);
          this.errorMessage = 'Search failed. Please try again.';
          this.snackBar.open('Search failed. Please try again.', 'Close', {
            duration: 5000,
            horizontalPosition: 'center',
            verticalPosition: 'bottom'
          });
        }
      });
  }
}