// src/app/features/recruiter/candidates/candidate-profile.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { EmployeeService } from '../../../core/services/employee.service';
import { RecruiterService } from '../../../core/services/recruiter.service';
import { Employee } from '../../../core/models/employee.model';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EmployeeProfileComponent } from '../../../shared/components/employee-profile/employee-profile.component';

@Component({
  selector: 'app-candidate-profile',
  standalone: true,
  imports: [CommonModule, RouterLink, PageHeaderComponent, EmployeeProfileComponent],
  template: `
    <!-- Back button + action bar -->
    <div class="d-flex align-items-center gap-3 mb-3 flex-wrap">
      <a routerLink="/recruiter/candidates" class="btn btn-sm btn-outline-secondary">
        <i class="bi bi-arrow-left me-1"></i>Back to Candidates
      </a>

      @if (employee) {
        <div class="ms-auto d-flex align-items-center gap-2">
          @if (shortlisted) {
            <span class="badge rounded-pill px-3 py-2"
              style="background:var(--th-emerald-soft);color:var(--th-emerald);font-size:.8rem;">
              <i class="bi bi-bookmark-star-fill me-1"></i>Shortlisted
            </span>
          } @else {
            <button class="btn btn-primary btn-sm" (click)="addToShortlist()"
              [disabled]="shortlisting">
              @if (shortlisting) {
                <span class="spinner-border spinner-border-sm me-1"></span>Adding…
              } @else {
                <i class="bi bi-bookmark-plus me-1"></i>Add to Shortlist
              }
            </button>
          }
        </div>
      }
    </div>

    <!-- Loading -->
    @if (loading) {
      <div class="loading-state">
        <div class="spinner-border"></div>
        <div class="loading-state__text">Loading profile…</div>
      </div>

    <!-- Error -->
    } @else if (error) {
      <div class="alert alert-danger">{{ error }}</div>

    <!-- Profile -->
    } @else if (employee) {
      <app-employee-profile [employee]="employee" />
    }
  `,
})
export class CandidateProfileComponent implements OnInit {
  employee: Employee | null = null;
  loading = true;
  error = '';
  shortlisted = false;
  shortlisting = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private employeeService: EmployeeService,
    private recruiterService: RecruiterService,
    private toast: ToastService,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;

    // Load candidate profile
    this.employeeService.getById(id).pipe(
      catchError((err) => {
        this.error = err?.error?.message ?? 'Failed to load candidate profile.';
        this.loading = false;
        return of(null);
      }),
    ).subscribe((res) => {
      if (res) {
        this.employee = res.employee;
        this.loading = false;
      }
    });

    // Check if already shortlisted
    this.recruiterService.getShortlist().subscribe({
      next: (res) => {
        this.shortlisted = res.shortlist.some((e) => e.employee_id === id);
      },
    });
  }

  addToShortlist(): void {
    if (!this.employee) return;
    this.shortlisting = true;
    this.recruiterService.addToShortlist(this.employee.id).subscribe({
      next: () => {
        this.shortlisting = false;
        this.shortlisted = true;
        this.toast.success(`${this.employee!.first_name} ${this.employee!.last_name} added to shortlist`);
      },
      error: (err) => {
        this.shortlisting = false;
        this.toast.error(err?.error?.message ?? 'Failed to shortlist');
      },
    });
  }
}
