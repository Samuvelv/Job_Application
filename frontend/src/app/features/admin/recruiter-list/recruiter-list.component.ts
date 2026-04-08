// src/app/features/admin/recruiter-list/recruiter-list.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged, catchError, of } from 'rxjs';
import { RecruiterService } from '../../../core/services/recruiter.service';
import { Recruiter } from '../../../core/models/recruiter.model';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-recruiter-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, PageHeaderComponent, EmptyStateComponent],
  template: `
    <!-- Header -->
    <app-page-header
      title="Recruiters"
      [subtitle]="pagination.total + ' total recruiters'"
      icon="bi-people"
    >
      <a routerLink="/admin/recruiters/create" class="btn btn-primary btn-sm">
        <i class="bi bi-person-plus me-1"></i>Add Recruiter
      </a>
    </app-page-header>

    <!-- Filters -->
    <div class="filter-card" [formGroup]="filterForm">
      <div class="filter-card__title"><i class="bi bi-search"></i> Search</div>
      <div class="row g-2">
        <div class="col-md-6">
          <div class="input-group">
            <span class="input-group-text"><i class="bi bi-search"></i></span>
            <input formControlName="search" class="form-control form-control-sm"
              placeholder="Search name, company, email…">
          </div>
        </div>
      </div>
    </div>

    <!-- Table -->
    @if (loading) {
      <div class="loading-state">
        <div class="spinner-border"></div>
        <div class="loading-state__text">Loading recruiters…</div>
      </div>
    } @else if (recruiters.length === 0) {
      <app-empty-state
        icon="bi-people"
        title="No recruiters found"
        subtitle="Add your first recruiter to get started."
      />
    } @else {
      <div class="section-card">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead class="table-light">
              <tr>
                <th class="small">Name</th>
                <th class="small">Company</th>
                <th class="small">Email</th>
                <th class="small">Access Expires</th>
                <th class="small">Token</th>
                <th class="small">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (rec of recruiters; track rec.id) {
                <tr>
                  <td class="fw-semibold small">{{ rec.contact_name }}</td>
                  <td class="small text-muted">{{ rec.company_name || '—' }}</td>
                  <td class="small">{{ rec.email }}</td>
                  <td class="small">
                    <span [class.text-danger]="isExpired(rec.access_expires_at)">
                      {{ rec.access_expires_at | date:'dd MMM yyyy, HH:mm' }}
                    </span>
                  </td>
                  <td>
                    <span class="badge rounded-pill"
                      [class.bg-success]="rec.has_active_token"
                      [class.bg-secondary]="!rec.has_active_token">
                      {{ rec.has_active_token ? 'Active' : 'Inactive' }}
                    </span>
                  </td>
                  <td>
                    <div class="d-flex gap-1 flex-wrap">
                      <button class="btn btn-sm btn-outline-primary"
                        (click)="generateToken(rec)" [disabled]="tokenLoading === rec.id"
                        title="Generate new access token">
                        @if (tokenLoading === rec.id) {
                          <span class="spinner-border spinner-border-sm"></span>
                        } @else {
                          <i class="bi bi-key me-1"></i>New Token
                        }
                      </button>
                      <button class="btn btn-sm btn-outline-warning"
                        (click)="revokeToken(rec)" [disabled]="!rec.has_active_token"
                        title="Revoke access token">
                        <i class="bi bi-slash-circle me-1"></i>Revoke
                      </button>
                      <button class="btn btn-sm btn-outline-danger"
                        (click)="deleteRecruiter(rec)" title="Delete recruiter">
                        <i class="bi bi-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
      @if (pagination.pages > 1) {
        <nav class="mt-3 d-flex justify-content-center">
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
  `,
})
export class RecruiterListComponent implements OnInit {
  recruiters: Recruiter[] = [];
  pagination = { page: 1, limit: 20, total: 0, pages: 0 };
  loading = false;
  tokenLoading: string | null = null;

  filterForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private recruiterService: RecruiterService,
    private toast: ToastService,
    private confirm: ConfirmDialogService,
  ) {
    this.filterForm = this.fb.group({ search: [''] });
  }

  ngOnInit(): void {
    this.load();

    this.filterForm.valueChanges.pipe(
      debounceTime(400),
      distinctUntilChanged(),
    ).subscribe(() => {
      this.pagination.page = 1;
      this.load();
    });
  }

  load(): void {
    this.loading = true;
    const { search } = this.filterForm.value;
    this.recruiterService.list({ search: search || undefined, page: this.pagination.page, limit: this.pagination.limit })
      .pipe(catchError(() => of(null)))
      .subscribe((res) => {
        this.loading = false;
        if (res) {
          this.recruiters  = res.data;
          this.pagination  = res.pagination;
        }
      });
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.pagination.pages) return;
    this.pagination.page = page;
    this.load();
  }

  pageNumbers(): number[] {
    const { page, pages } = this.pagination;
    const start = Math.max(1, page - 2);
    const end   = Math.min(pages, page + 2);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  isExpired(dt: string): boolean {
    return new Date(dt) < new Date();
  }

  generateToken(rec: Recruiter): void {
    this.tokenLoading = rec.id;
    this.recruiterService.generateToken(rec.id, { send_email: true }).subscribe({
      next: (res) => {
        this.tokenLoading = null;
        this.toast.success(`Token generated. Copy it now: ${res.token.slice(0, 20)}…`);
        this.load();
      },
      error: (err) => {
        this.tokenLoading = null;
        this.toast.error(err?.error?.message ?? 'Failed to generate token');
      },
    });
  }

  async revokeToken(rec: Recruiter): Promise<void> {
    const ok = await this.confirm.confirm({
      title: 'Revoke Token',
      message: `Revoke the active token for ${rec.contact_name}? They will lose access immediately.`,
      confirmLabel: 'Revoke',
      confirmClass: 'btn-warning',
    });
    if (!ok) return;
    this.recruiterService.revokeToken(rec.id).subscribe({
      next: () => { this.toast.success('Token revoked'); this.load(); },
      error: (err) => this.toast.error(err?.error?.message ?? 'Failed to revoke'),
    });
  }

  async deleteRecruiter(rec: Recruiter): Promise<void> {
    const ok = await this.confirm.confirm({
      title: 'Delete Recruiter',
      message: `Delete ${rec.contact_name}? This action is irreversible.`,
      confirmLabel: 'Delete',
      confirmClass: 'btn-danger',
    });
    if (!ok) return;
    this.recruiterService.delete(rec.id).subscribe({
      next: () => { this.toast.success('Recruiter deleted'); this.load(); },
      error: (err) => this.toast.error(err?.error?.message ?? 'Failed to delete'),
    });
  }
}
