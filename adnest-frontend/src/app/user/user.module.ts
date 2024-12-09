import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserRoutingModule } from './user-routing.module';
import { UserSearchModule } from './user-search/user-search.module';

@NgModule({
  imports: [
    CommonModule,
    UserRoutingModule,
    UserSearchModule
  ]
})
export class UserModule { }