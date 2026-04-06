// src/app/features/recruiter/candidates/candidates.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { debounceTime, distinctUntilChanged, catchError, of } from 'rxjs';
import { EmployeeService, PaginatedEmployees } from '../../../core/services/employee.service';
import { RecruiterService } from '../../../core/services/recruiter.service';
import { Employee } from '../../../core/models/employee.model';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-candidates',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PageHeaderComponent, EmptyStateComponent],
  template: `
    <div class="d-flex justify-content-between align-items-start mb-4">
      <app-page-header
        title="Search Talent"
        [subtitle]="pagination.total + ' candidates available'"
        icon="bi-person-search"
        class="flex-grow-1"
      />
    </div>

    <!-- Filters -->
    <div class="card p-3 mb-4" [formGroup]="filterForm">
      <div class="row g-2">
        <div class="col-md-4">
          <div class="input-group">
            <span class="input-group-text"><i class="bi bi-search"></i></span>
            <input formControlName="search" class="form-control form-control-sm"
              placeholder="Name, job title, skills…">
          </div>
        </div>
        <div class="col-md-2">
          <input formControlName="industry" class="form-control form-control-sm"
            placeholder="Industry">
        </div>
        <div class="col-md-2">
          <input formControlName="occupation" class="form-control form-control-sm"
            placeholder="Occupation">
        </div>
        <div class="col-md-2">
          <input formControlName="currentCountry" class="form-control form-control-sm"
            placeholder="Country">
        </div>
        <div class="col-md-2">
          <input formControlName="yearsExperience" type="number" class="form-control form-control-sm"
            placeholder="Min yrs exp" min="0">
        </div>
      </div>
    </div>

    <!-- Cards grid -->
    @if (loading) {
      <div class="text-center py-5"><div class="spinner-border text-primary"></div></div>
    } @else if (employees.length === 0) {
      <app-empty-state
        icon="bi-person-search"
        title="No candidates match your filters"
        subtitle="Try adjusting your search criteria."
      />
    } @else {
      <div class="row g-3">
        @for (emp of employees; track emp.id) {
          <div class="col-md-6 col-lg-4">
            <div class="card h-100 p-3 d-flex flex-column">

              <!-- Avatar + name -->
              <div class="d-flex align-items-center gap-3 mb-3">
                @if (emp.profile_photo_url) {
                  <img [src]="emp.profile_photo_url" alt="photo"
                    class="rounded-circle flex-shrink-0"
                    style="width:52px;height:52px;object-fit:cover;">
                } @else {
                  <div class="rounded-circle bg-primary text-white d-flex align-items-center
                    justify-content-center fw-bold flex-shrink-0"
                    style="width:52px;height:52px;font-size:1.1rem">
                    {{ emp.first_name[0] }}{{ emp.last_name[0] }}
                  </div>
                }
                <div class="overflow-hidden">
                  <div class="fw-semibold text-truncate">{{ emp.first_name }} {{ emp.last_name }}</div>
                  <div class="text-muted small text-truncate">{{ emp.job_title || emp.occupation || '—' }}</div>
                </div>
              </div>

              <!-- Meta -->
              <div class="small text-muted mb-2">
                @if (emp.industry) {
                  <span class="badge bg-light text-dark border me-1">{{ emp.industry }}</span>
                }
                @if (emp.current_city || emp.current_country) {
                  <span>
                    <i class="bi bi-geo-alt me-1"></i>{{ emp.current_city }}{{ emp.current_city && emp.current_country ? ', ' : '' }}{{ emp.current_country }}
                  </span>
                }
              </div>

              @if (emp.years_experience != null) {
                <div class="small text-muted mb-2">
                  <i class="bi bi-briefcase me-1"></i>{{ emp.years_experience }} yrs experience
                </div>
              }

              <!-- Skills preview -->
              @if (emp.skills?.length) {
                <div class="d-flex flex-wrap gap-1 mb-3">
                  @for (s of emp.skills!.slice(0,4); track s.skill_name) {
                    <span class="badge bg-light text-dark border small">{{ s.skill_name }}</span>
                  }
                  @if (emp.skills!.length > 4) {
                    <span class="badge bg-light text-muted border small">+{{ emp.skills!.length - 4 }}</span>
                  }
                </div>
              }

              <div class="mt-auto d-flex gap-2">
                <button class="btn btn-sm btn-outline-primary flex-grow-1"
                  (click)="viewProfile(emp)">
                  <i class="bi bi-eye me-1"></i>View Profile
                </button>
                @if (shortlistedIds.has(emp.id)) {
                  <button class="btn btn-sm btn-success" disabled title="Shortlisted">
                    <i class="bi bi-bookmark-star-fill"></i>
                  </button>
                } @else {
                  <button class="btn btn-sm btn-outline-secondary"
                    (click)="shortlist(emp)" [disabled]="shortlisting === emp.id"
                    title="Add to shortlist">
                    @if (shortlisting === emp.id) {
                      <span class="spinner-border spinner-border-sm"></span>
                    } @else {
                      <i class="bi bi-bookmark-plus"></i>
                    }
                  </button>
                }
              </div>

            </div>
          </div>
        }
      </div>

      <!-- Pagination -->
      @if (pagination.pages > 1) {
        <nav class="mt-4 d-flex justify-content-center">
          <ul class="pagination pagination-sm mb-0">
            <li class="page-item" [class.disabled]="pagination.page === 1">
              <button class="page-link" (click)="goToPage(pagination.page - 1)">«</button>
            </li>
            @for (pg of pageNumbers(); track pg) {
              <li class="page-item" [class.active]="pg === pagination.page">
                <button class="page-link" (click)="goToPage(pg)">{{ pg }}</button>
              </li>
            }
            <li class="page-item" [class.disabled]="pagination.page === pagination.pages">
              <button class="page-link" (click)="goToPage(pagination.page + 1)">»</button>
            </li>
          </ul>
        </nav>
      }
    }

    <!-- Profile modal -->
    @if (selectedEmployee) {
      <div class="modal d-block" tabindex="-1" style="background:rgba(0,0,0,.5)">
        <div class="modal-dialog modal-xl modal-dialog-scrollable">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">
                <i class="bi bi-person-circle me-2"></i>
                {{ selectedEmployee.first_name }} {{ selectedEmployee.last_name }}
              </h5>
              <button type="button" class="btn-close" (click)="selectedEmployee = null"></button>
            </div>
            <div class="modal-body">
              <div class="row g-3">
                <div class="col-md-4">
                  @if (selectedEmployee.profile_photo_url) {
                    <img [src]="selectedEmployee.profile_photo_url" class="img-fluid rounded mb-3" alt="photo">
                  }
                  @if (selectedEmployee.email) {
                    <p class="mb-1 small"><i class="bi bi-envelope me-1 text-muted"></i>{{ selectedEmployee.email }}</p>
                  }
                  @if (selectedEmployee.phone) {
                    <p class="mb-1 small"><i class="bi bi-telephone me-1 text-muted"></i>{{ selectedEmployee.phone }}</p>
                  }
                  <p class="mb-1 small">
                    <i class="bi bi-geo-alt me-1 text-muted"></i>
                    {{ selectedEmployee.current_city }}{{ selectedEmployee.current_city && selectedEmployee.current_country ? ', ' : '' }}{{ selectedEmployee.current_country || '—' }}
                  </p>
                  @if (selectedEmployee.nationality) {
                    <p class="mb-1 small"><i class="bi bi-flag me-1 text-muted"></i>{{ selectedEmployee.nationality }}</p>
                  }
                  @if (selectedEmployee.salary_min || selectedEmployee.salary_max) {
                    <p class="mb-1 small">
                      <i class="bi bi-cash-coin me-1 text-muted"></i>
                      {{ selectedEmployee.salary_currency }} {{ selectedEmployee.salary_min | number }}
                      @if (selectedEmployee.salary_max) { – {{ selectedEmployee.salary_max | number }} }
                      / {{ selectedEmployee.salary_type }}
                    </p>
                  }
                  @if (selectedEmployee.resume_url) {
                    <a [href]="selectedEmployee.resume_url" target="_blank" class="btn btn-sm btn-outline-primary mt-2 w-100">
                      <i class="bi bi-file-earmark-person me-1"></i>Download CV
                    </a>
                  }
                </div>
                <div class="col-md-8">
                  @if (selectedEmployee.bio) {
                    <p class="small lh-lg mb-3">{{ selectedEmployee.bio }}</p>
                  }
                  @if (selectedEmployee.skills?.length) {
                    <h6 class="small fw-bold text-muted text-uppercase mb-2">Skills</h6>
                    <div class="d-flex flex-wrap gap-1 mb-3">
                      @for (s of selectedEmployee.skills; track s.skill_name) {
                        <span class="badge bg-light text-dark border">{{ s.skill_name }}</span>
                      }
                    </div>
                  }
                  @if (selectedEmployee.experience?.length) {
                    <h6 class="small fw-bold text-muted text-uppercase mb-2">Experience</h6>
                    @for (exp of selectedEmployee.experience; track $index) {
                      <div class="border-start border-primary ps-3 mb-3">
                        <div class="fw-semibold small">{{ exp.job_title }}</div>
                        <div class="text-muted small">{{ exp.company_name }}</div>
                        <div class="text-muted small">
                          {{ exp.start_date | date:'MMM yyyy' }} — {{ exp.end_date ? (exp.end_date | date:'MMM yyyy') : 'Present' }}
                        </div>
                      </div>
                    }
                  }
                  @if (selectedEmployee.education?.length) {
                    <h6 class="small fw-bold text-muted text-uppercase mb-2">Education</h6>
                    @for (edu of selectedEmployee.education; track $index) {
                      <div class="border-start border-success ps-3 mb-2">
                        <div class="fw-semibold small">{{ edu.degree }} @if (edu.field_of_study) { in {{ edu.field_of_study }} }</div>
                        <div class="text-muted small">{{ edu.institution }}</div>
                      </div>
                    }
                  }
                </div>
              </div>
            </div>
            <div class="modal-footer">
              @if (shortlistedIds.has(selectedEmployee.id)) {
                <span class="text-success me-auto small fw-semibold">
                  <i class="bi bi-bookmark-star-fill me-1"></i>Shortlisted
                </span>
              } @else {
                <button class="btn btn-primary" (click)="shortlist(selectedEmployee!)"
                  [disabled]="shortlisting === selectedEmployee.id">
                  @if (shortlisting === selectedEmployee.id) {
                    <span class="spinner-border spinner-border-sm me-1"></span>Adding…
                  } @else {
                    <i class="bi bi-bookmark-plus me-1"></i>Add to Shortlist
                  }
                </button>
              }
              <button class="btn btn-outline-secondary" (click)="selectedEmployee = null">Close</button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
})
export class CandidatesComponent implements OnInit {
  employees: Employee[] = [];
  pagination = { page: 1, limit: 12, total: 0, pages: 0 };
  loading = false;
  shortlistedIds = new Set<string>();
  shortlisting: string | null = null;
  selectedEmployee: Employee | null = null;

  filterForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private employeeService: EmployeeService,
    private recruiterService: RecruiterService,
    private toast: ToastService,
  ) {
    this.filterForm = this.fb.group({
      search:          [''],
      industry:        [''],
      occupation:      [''],
      currentCountry:  [''],
      yearsExperience: [''],
    });
  }

  ngOnInit(): void {
    this.loadShortlist();
    this.load();

    this.filterForm.valueChanges.pipe(
      debounceTime(500),
      distinctUntilChanged(),
    ).subscribe(() => {
      this.pagination.page = 1;
      this.load();
    });
  }

  loadShortlist(): void {
    this.recruiterService.getShortlist().subscribe({
      next: (res) => {
        this.shortlistedIds = new Set(res.shortlist.map((e) => e.employee_id));
      },
    });
  }

  load(): void {
    this.loading = true;
    const v = this.filterForm.value;
    this.employeeService.list({
      search:          v.search          || undefined,
      industry:        v.industry        || undefined,
      occupation:      v.occupation      || undefined,
      currentCountry:  v.currentCountry  || undefined,
      yearsExperience: v.yearsExperience ? +v.yearsExperience : undefined,
      page:            this.pagination.page,
      limit:           this.pagination.limit,
    }).pipe(catchError(() => of(null as unknown as PaginatedEmployees)))
      .subscribe((res) => {
        this.loading = false;
        if (res) {
          this.employees  = res.data;
          this.pagination = res.pagination;
        }
      });
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.pagination.pages) return;
    this.pagination.page = page;
    this.load();
  }

  pageNumbers(): number[] {
    return Array.from({ length: this.pagination.pages }, (_, i) => i + 1);
  }

  viewProfile(emp: Employee): void {
    this.selectedEmployee = emp;
  }

  shortlist(emp: Employee): void {
    this.shortlisting = emp.id;
    this.recruiterService.addToShortlist(emp.id).subscribe({
      next: () => {
        this.shortlisting = null;
        this.shortlistedIds = new Set([...this.shortlistedIds, emp.id]);
        this.toast.success(`${emp.first_name} ${emp.last_name} added to shortlist`);
      },
      error: (err) => {
        this.shortlisting = null;
        this.toast.error(err?.error?.message ?? 'Failed to shortlist');
      },
    });
  }
}
