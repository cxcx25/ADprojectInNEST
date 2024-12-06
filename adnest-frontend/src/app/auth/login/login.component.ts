import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule
  ],
  template: `
    <mat-card>
      <mat-card-header>
        <mat-card-title>Login</mat-card-title>
      </mat-card-header>
      <mat-card-content>
        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
          <mat-form-field appearance="fill">
            <mat-label>Username</mat-label>
            <input matInput formControlName="username" required>
          </mat-form-field>
          <mat-form-field appearance="fill">
            <mat-label>Password</mat-label>
            <input matInput type="password" formControlName="password" required>
          </mat-form-field>
          <button mat-raised-button color="primary" type="submit" [disabled]="!loginForm.valid">
            Login
          </button>
        </form>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    :host {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100%;
      padding: 20px;
    }
    mat-card {
      max-width: 400px;
      width: 100%;
    }
    mat-form-field {
      width: 100%;
      margin-bottom: 16px;
    }
    form {
      display: flex;
      flex-direction: column;
      padding: 20px;
    }
  `]
})
export class LoginComponent {
  loginForm: FormGroup;

  constructor(private fb: FormBuilder) {
    this.loginForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  onSubmit() {
    if (this.loginForm.valid) {
      console.log('Login form submitted', this.loginForm.value);
      // TODO: Implement login logic
    }
  }
}