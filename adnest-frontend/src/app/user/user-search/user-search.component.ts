import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { finalize } from 'rxjs/operators';
import { MatSnackBar } from '@angular/material/snack-bar';

interface ADUser {
  displayName: string;
  samAccountName: string;
  name: string;
  email: string;
  department: string;
  userPrincipalName: string;
  distinguishedName: string;
  whenCreated: Date;
  whenChanged: Date;
  status: {
    isLocked: boolean;
    isDisabled: boolean;
    passwordExpired: boolean;
  };
  passwordLastSet?: Date;
  passwordExpirationDate?: string;
  accountExpirationDate?: string;
}

@Component({
  selector: 'app-user-search',
  templateUrl: './user-search.component.html',
  styleUrls: ['./user-search.component.scss']
})
export class UserSearchComponent implements OnInit {
  searchQuery = '';
  adSearchQuery = '';
  isAdvancedSearch = false;
  loading = false;
  errorMessage: string | null = null;
  users: ADUser[] = [];

  constructor(
    private http: HttpClient,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    console.log('UserSearchComponent initialized');
    // Optionally, perform initial setup or logging
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.adSearchQuery = '';
    this.users = [];
    this.errorMessage = null;
  }

  onSearch(): void {
    console.log('Starting search...');
    console.log('Is Advanced Search:', this.isAdvancedSearch);
    this.errorMessage = null;
    const query = this.isAdvancedSearch ? this.adSearchQuery : this.searchQuery;

    if (!query?.trim()) {
      this.errorMessage = 'Please enter a search term';
      console.warn('Search aborted: No query provided');
      return;
    }

    console.log(`Searching with query: ${query} (Advanced: ${this.isAdvancedSearch})`);
    this.loading = true;
    this.users = [];

    const endpoint = this.isAdvancedSearch ? '/api/users/advanced-search' : '/api/users/search';
    const params: any = this.isAdvancedSearch 
      ? { name: query.trim(), domain: 'lux' } 
      : { query: query.trim(), domain: 'lux' };
    
    console.log('Endpoint:', endpoint);
    console.log('Search Params:', params);

    this.http.get<ADUser[]>(endpoint, { params })
    .pipe(
      finalize(() => {
        console.log('Search completed');
        this.loading = false;
      })
    )
    .subscribe({
      next: (users) => {
        console.log(`Found ${users.length} users:`, users);
        this.users = users;
        if (users.length === 0) {
          this.errorMessage = 'No users found';
          console.warn('No users found for query:', query);
        }
      },
      error: (error) => {
        console.error('Search error:', error);
        // Log more detailed error information
        console.error('Error details:', {
          status: error.status,
          message: error.message,
          url: error.url,
          error: error.error
        });
        
        this.errorMessage = error.error?.message || error.message || 'Failed to search users';
        this.snackBar.open(this.errorMessage || 'An unknown error occurred', 'Close', { 
          duration: 5000,
          horizontalPosition: 'center',
          verticalPosition: 'top'
        });
      }
    });
  }
}