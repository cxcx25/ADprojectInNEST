import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';

interface UserProfile {
  username: string;
  displayName: string;
  email: string;
  department?: string;
  status: string;
}

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatDividerModule,
    MatListModule,
    MatIconModule
  ],
  template: `
    <div class="profile-container">
      <mat-card>
        <mat-card-header>
          <mat-card-title>User Profile</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div *ngIf="userProfile" class="profile-content">
            <mat-list>
              <mat-list-item>
                <mat-icon matListItemIcon>person</mat-icon>
                <div matListItemTitle>Username</div>
                <div matListItemLine>{{ userProfile.username }}</div>
              </mat-list-item>
              
              <mat-divider></mat-divider>
              
              <mat-list-item>
                <mat-icon matListItemIcon>badge</mat-icon>
                <div matListItemTitle>Display Name</div>
                <div matListItemLine>{{ userProfile.displayName }}</div>
              </mat-list-item>
              
              <mat-divider></mat-divider>
              
              <mat-list-item>
                <mat-icon matListItemIcon>email</mat-icon>
                <div matListItemTitle>Email</div>
                <div matListItemLine>{{ userProfile.email }}</div>
              </mat-list-item>
              
              <mat-divider></mat-divider>
              
              <mat-list-item *ngIf="userProfile.department">
                <mat-icon matListItemIcon>business</mat-icon>
                <div matListItemTitle>Department</div>
                <div matListItemLine>{{ userProfile.department }}</div>
              </mat-list-item>
              
              <mat-divider *ngIf="userProfile.department"></mat-divider>
              
              <mat-list-item>
                <mat-icon matListItemIcon>verified_user</mat-icon>
                <div matListItemTitle>Status</div>
                <div matListItemLine>{{ userProfile.status }}</div>
              </mat-list-item>
            </mat-list>
          </div>
          <div *ngIf="!userProfile" class="no-profile">
            <mat-icon>error_outline</mat-icon>
            <p>User profile not found</p>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .profile-container {
      padding: 20px;
      max-width: 800px;
      margin: 0 auto;
    }

    .profile-content {
      padding: 16px;
    }

    .no-profile {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 40px;
      color: #666;
      
      mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        margin-bottom: 16px;
      }
    }

    mat-list-item {
      height: auto;
      margin-bottom: 16px;
    }
  `]
})
export class UserProfileComponent implements OnInit {
  userProfile: UserProfile | null = null;

  ngOnInit() {
    // TODO: Fetch user profile from service
    this.userProfile = {
      username: 'john.doe',
      displayName: 'John Doe',
      email: 'john.doe@example.com',
      department: 'IT Department',
      status: 'Active'
    };
  }
}