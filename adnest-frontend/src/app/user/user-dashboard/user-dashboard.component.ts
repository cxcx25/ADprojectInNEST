import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-user-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    RouterModule
  ],
  template: `
    <div class="dashboard-container">
      <mat-card class="search-card">
        <mat-card-header>
          <mat-card-title>User Search</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <p>Search for users across domains</p>
        </mat-card-content>
        <mat-card-actions>
          <button mat-raised-button color="primary" routerLink="/user/search">
            <mat-icon>search</mat-icon>
            Search Users
          </button>
        </mat-card-actions>
      </mat-card>

      <mat-card class="profile-card">
        <mat-card-header>
          <mat-card-title>User Profile</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <p>View and manage user profiles</p>
        </mat-card-content>
        <mat-card-actions>
          <button mat-raised-button color="primary" routerLink="/user/profile">
            <mat-icon>person</mat-icon>
            View Profile
          </button>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: [`
    .dashboard-container {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }

    mat-card {
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    mat-card-content {
      flex-grow: 1;
    }

    mat-card-actions {
      padding: 16px;
      display: flex;
      justify-content: flex-end;
    }

    button {
      mat-icon {
        margin-right: 8px;
      }
    }
  `]
})
export class UserDashboardComponent {
}