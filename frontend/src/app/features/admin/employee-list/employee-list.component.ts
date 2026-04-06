// src/app/features/admin/employee-list/employee-list.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged, switchMap, catchError, of } from 'rxjs';
import { EmployeeService } from '../../../core/services/employee.service';
import { Employee } from '../../../core/models/employee.model';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';

@Component({
  selector: 'app-employee-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, PageHeaderComponent, EmptyStateComponent],
  template: `
    <app-page-header title="Employees" icon="bi-people-fill"
                     [subtitle]="pagination.total + ' total employees'">
      <a routerLink="/admin/employees/register" class="btn btn-primary btn-sm">
        <i class="bi bi-plus-lg me-1"></i> Register Employee
      </a>
    </app-page-header>

    <!-- Filters -->
    <div class="card p-3 mb-4">
      <form [formGroup]="filterForm" class="row g-2">
        <div class="col-md-3">
          <input type="text" class="form-control form-control-sm" formControlName="search"
            placeholder="Search name, email, title…">
        </div>
        <div class="col-md-2">
          <input type="text" class="form-control form-control-sm" formControlName="industry"
            placeholder="Industry">
        </div>
        <div class="col-md-2">
          <input type="text" class="form-control form-control-sm" formControlName="currentCountry"
            placeholder="Country">
        </div>
        <div class="col-md-2">
          <input type="text" class="form-control form-control-sm" formControlName="skills"
            placeholder="Skills (comma-sep)">
        </div>
        <div class="col-md-2">
          <input type="number" class="form-control form-control-sm" formControlName="yearsExperience"
            placeholder="Min. years exp.">
        </div>
        <div class="col-md-1">
          <button type="button" class="btn btn-sm btn-outline-secondary w-100"
            (click)="clearFilters()">Clear</button>
        </div>
      </form>
    </div>

    <!-- Loading -->
    @if (loading) {
      <div class="text-center py-5">
        <div class="spinner-border text-primary"></div>
        <p class="text-muted mt-2">Loading employees…</p>
      </div>
    }

    <!-- Empty -->
    @if (!loading && employees.length === 0) {
      <app-empty-state icon="bi-people"
                       title="No employees found"
                       message="Try adjusting your filters or register a new employee." />
    }

    <!-- Responsive card-table -->
    @if (!loading && employees.length > 0) {
      <div class="card">
        <!-- Desktop table -->
        <div class="table-responsive d-none d-md-block">
          <table class="table table-hover align-middle mb-0">
            <thead class="table-light">
              <tr>
                <th>Employee</th>
                <th>Job Title</th>
                <th>Industry</th>
                <th>Location</th>
                <th>Exp.</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (emp of employees; track emp.id) {
                <tr>
                  <td>
                    <div class="d-flex align-items-center gap-2">
                      <div class="avatar-circle-sm flex-shrink-0">
                        {{ emp.first_name[0] }}{{ emp.last_name[0] }}
                      </div>
                      <div>
                        <div class="fw-semibold small">{{ emp.first_name }} {{ emp.last_name }}</div>
                        <div class="text-muted" style="font-size:.75rem">{{ emp.email }}</div>
                      </div>
                    </div>
                  </td>
                  <td class="small">{{ emp.job_title || '—' }}</td>
                  <td class="small">{{ emp.industry || '—' }}</td>
                  <td class="small">{{ emp.current_city || '' }}{{ emp.current_country ? ', ' + emp.current_country : '' || '—' }}</td>
                  <td class="small">{{ emp.years_experience != null ? emp.years_experience + ' yrs' : '—' }}</td>
                  <td>
                    <span class="badge rounded-pill"
                      [class.bg-success]="emp.profile_status === 'active'"
                      [class.bg-warning]="emp.profile_status === 'pending_edit'"
                      [class.text-dark]="emp.profile_status === 'pending_edit'"
                      [class.bg-secondary]="emp.profile_status === 'inactive'">
                      {{ emp.profile_status | titlecase }}
                    </span>
                  </td>
                  <td>
                    <div class="d-flex gap-1">
                      <a [routerLink]="['/admin/employees', emp.id]"
                        class="btn btn-sm btn-outline-primary">View</a>
                      <button class="btn btn-sm btn-outline-secondary"
                        (click)="resendCreds(emp)" title="Resend credentials">
                        <i class="bi bi-envelope"></i>
                      </button>
                      <button class="btn btn-sm btn-outline-danger"
                        (click)="deleteEmployee(emp)">
                        <i class="bi bi-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Mobile card list -->
        <div class="d-md-none">
          @for (emp of employees; track emp.id) {
            <div class="card-table-row border-bottom p-3">
              <div class="d-flex align-items-center gap-3 mb-2">
                <div class="avatar-circle-sm flex-shrink-0">
                  {{ emp.first_name[0] }}{{ emp.last_name[0] }}
                </div>
                <div class="flex-grow-1 min-width-0">
                  <div class="fw-semibold text-truncate">{{ emp.first_name }} {{ emp.last_name }}</div>
                  <div class="text-muted small text-truncate">{{ emp.email }}</div>
                </div>
                <span class="badge rounded-pill flex-shrink-0"
                  [class.bg-success]="emp.profile_status === 'active'"
                  [class.bg-warning]="emp.profile_status === 'pending_edit'"
                  [class.text-dark]="emp.profile_status === 'pending_edit'"
                  [class.bg-secondary]="emp.profile_status === 'inactive'">
                  {{ emp.profile_status | titlecase }}
                </span>
              </div>
              <div class="d-flex flex-wrap gap-2 small text-muted mb-2">
                @if (emp.job_title) { <span><i class="bi bi-briefcase me-1"></i>{{ emp.job_title }}</span> }
                @if (emp.current_country) { <span><i class="bi bi-geo-alt me-1"></i>{{ emp.current_city ? emp.current_city + ', ' : '' }}{{ emp.current_country }}</span> }
                @if (emp.years_experience != null) { <span><i class="bi bi-clock-history me-1"></i>{{ emp.years_experience }} yrs</span> }
              </div>
              <div class="d-flex gap-1">
                <a [routerLink]="['/admin/employees', emp.id]" class="btn btn-sm btn-outline-primary">View</a>
                <button class="btn btn-sm btn-outline-secondary" (click)="resendCreds(emp)">
                  <i class="bi bi-envelope"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" (click)="deleteEmployee(emp)">
                  <i class="bi bi-trash"></i>
                </button>
              </div>
            </div>
          }
        </div>

        <!-- Pagination -->
        @if (pagination.pages > 1) {
          <div class="d-flex justify-content-between align-items-center px-3 py-2 border-top flex-wrap gap-2">
            <small class="text-muted">
              Page {{ pagination.page }} of {{ pagination.pages }} ({{ pagination.total }} results)
            </small>
            <div class="d-flex gap-1">
              <button class="btn btn-sm btn-outline-secondary"
                [disabled]="pagination.page === 1" (click)="changePage(pagination.page - 1)">&laquo;</button>
              @for (pg of pageRange(); track pg) {
                <button class="btn btn-sm"
                  [class.btn-primary]="pg === pagination.page"
                  [class.btn-outline-secondary]="pg !== pagination.page"
                  (click)="changePage(pg)">{{ pg }}</button>
              }
              <button class="btn btn-sm btn-outline-secondary"
                [disabled]="pagination.page === pagination.pages"
                (click)="changePage(pagination.page + 1)">&raquo;</button>
            </div>
          </div>
        }
      </div>
    }
  `,
})
export class EmployeeListComponent implements OnInit {
  employees: Employee[] = [];
  pagination = { page: 1, limit: 20, total: 0, pages: 1 };
  loading = true;
  filterForm!: FormGroup;

  constructor(
    private empSvc: EmployeeService,
    private fb: FormBuilder,
    private toast: ToastService,
    private confirm: ConfirmDialogService,
  ) {}

  ngOnInit(): void {
    this.filterForm = this.fb.group({
      search:          [''],
      industry:        [''],
      currentCountry:  [''],
      skills:          [''],
      yearsExperience: [null],
    });

    this.filterForm.valueChanges.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      switchMap((filters) => {
        this.loading = true;
        return this.empSvc.list({ ...filters, page: 1, limit: 20 }).pipe(
          catchError(() => of({ data: [], pagination: this.pagination })),
        );
      }),
    ).subscribe((res) => {
      this.employees  = res.data;
      this.pagination = res.pagination;
      this.loading    = false;
    });

    this.loadEmployees();
  }

  loadEmployees(): void {
    this.loading = true;
    this.empSvc.list({ ...this.filterForm.value, page: this.pagination.page, limit: 20 })
      .subscribe({
        next:  res => { this.employees = res.data; this.pagination = res.pagination; this.loading = false; },
        error: ()  => { this.loading = false; },
      });
  }

  clearFilters(): void {
    this.filterForm.reset();
    this.pagination.page = 1;
    this.loadEmployees();
  }

  changePage(page: number): void {
    this.pagination.page = page;
    this.loadEmployees();
  }

  pageRange(): number[] {
    const { page, pages } = this.pagination;
    const start = Math.max(1, page - 2);
    const end   = Math.min(pages, page + 2);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  resendCreds(emp: Employee): void {
    this.confirm.confirm({ title: 'Resend Credentials', message: `Resend login credentials to ${emp.email}?`, confirmLabel: 'Send', confirmClass: 'btn-primary' })
      .then(ok => {
        if (!ok) return;
        this.empSvc.resendCredentials(emp.id).subscribe({
          next:  () => this.toast.show('Credentials sent!', 'success'),
          error: (err) => this.toast.show(err?.error?.message ?? 'Failed to send', 'error'),
        });
      });
  }

  deleteEmployee(emp: Employee): void {
    this.confirm.confirm({ title: 'Delete Employee', message: `Delete ${emp.first_name} ${emp.last_name}? This cannot be undone.`, confirmLabel: 'Delete', confirmClass: 'btn-danger' })
      .then(ok => {
        if (!ok) return;
        this.empSvc.delete(emp.id).subscribe({
          next:  () => { this.toast.show('Employee deleted', 'success'); this.loadEmployees(); },
          error: (err) => this.toast.show(err?.error?.message ?? 'Delete failed', 'error'),
        });
      });
  }
}
