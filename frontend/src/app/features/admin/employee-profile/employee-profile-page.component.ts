// src/app/features/admin/employee-profile/employee-profile-page.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { EmployeeService } from '../../../core/services/employee.service';
import { Employee } from '../../../core/models/employee.model';
import { EmployeeProfileComponent } from '../../../shared/components/employee-profile/employee-profile.component';

@Component({
  selector: 'app-employee-profile-page',
  standalone: true,
  imports: [CommonModule, RouterLink, EmployeeProfileComponent],
  template: `
    <!-- Back link -->
    <div class="mb-3">
      <a routerLink="/admin/employees" class="back-btn">
        <i class="bi bi-arrow-left"></i>Back to Employees
      </a>
    </div>

    @if (error) {
      <div class="alert alert-danger">{{ error }}</div>
    } @else if (!employee) {
      <div class="loading-state">
        <div class="spinner-border"></div>
        <div class="loading-state__text">Loading profile…</div>
      </div>
    } @else {
      <app-employee-profile [employee]="employee" />
    }
  `,
})
export class EmployeeProfilePageComponent implements OnInit {
  employee: Employee | null = null;
  error = '';

  constructor(
    private route: ActivatedRoute,
    private employeeService: EmployeeService,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error = 'Invalid employee ID.';
      return;
    }
    this.employeeService.getById(id).subscribe({
      next: (res) => (this.employee = res.employee),
      error: (err) => (this.error = err?.error?.message ?? 'Failed to load employee.'),
    });
  }
}
