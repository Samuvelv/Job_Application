// src/app/features/employee/profile/my-profile.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EmployeeService } from '../../../core/services/employee.service';
import { Employee } from '../../../core/models/employee.model';
import { EmployeeProfileComponent } from '../../../shared/components/employee-profile/employee-profile.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-my-profile',
  standalone: true,
  imports: [CommonModule, EmployeeProfileComponent, PageHeaderComponent],
  template: `
    <app-page-header
      title="My Profile"
      subtitle="View your current profile information"
      icon="bi-person-badge"
    />

    @if (error) {
      <div class="alert alert-danger">{{ error }}</div>
    } @else if (!employee) {
      <div class="loading-state">
        <div class="spinner-border"></div>
        <div class="loading-state__text">Loading your profile…</div>
      </div>
    } @else {
      <app-employee-profile [employee]="employee" />
    }
  `,
})
export class MyProfileComponent implements OnInit {
  employee: Employee | null = null;
  error = '';

  constructor(private employeeService: EmployeeService) {}

  ngOnInit(): void {
    this.employeeService.getMyProfile().subscribe({
      next: (res) => (this.employee = res.employee),
      error: (err) => (this.error = err?.error?.message ?? 'Failed to load profile.'),
    });
  }
}
