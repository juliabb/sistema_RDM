// src\app\pages\dashboard\dashboard.component.ts
import { Component, OnInit } from '@angular/core';

import { AuthService } from '../../services/auth-services';
import { HeaderComponent } from "../../components/header/header.component";
import { RdmFormComponent } from './rdm-form/rdm-form';
import { RequestsTableComponent } from './requests-table/requests-table';
import { TabsComponent } from './dashboard-nav/dashboard-nav';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    HeaderComponent,
    RdmFormComponent,
    RequestsTableComponent,
    TabsComponent
],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent implements OnInit {
  activeTab = 'new-request';
  isAdmin = false;
  user: any = null;

  constructor(private readonly authService: AuthService) {}

  ngOnInit(): void {
    this.loadUserData();
  }

  private loadUserData() {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.user = user;
      this.isAdmin = user.role === 'admin';
    }
  }

  onTabSelect(tabId: string): void {
    this.activeTab = tabId;
  }
}
