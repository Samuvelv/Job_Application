// src/app/features/admin/recruiter-list/recruiter-list.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';import { debounceTime, distinctUntilChanged, catchError, of } from 'rxjs';
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
                <th class="small">Status</th>
                <th class="small">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (rec of recruiters; track rec.id) {
                <tr>
                  <td class="fw-semibold small">{{ rec.contact_name }}</td>
                  <td class="small text-muted">{{ rec.company_name || '—' }}</td>
                  <td class="small">{{ rec.email }}</td>
                  <td>
                    <span class="badge rounded-pill"
                      [class.bg-success]="rec.is_active"
                      [class.bg-secondary]="!rec.is_active">
                      {{ rec.is_active ? 'Active' : 'Inactive' }}
                    </span>
                  </td>
                  <td>
                    <div class="tbl-actions">
                      <a [routerLink]="['/admin/recruiters', rec.id]"
                        class="tbl-actions__btn tbl-actions__btn--view tbl-actions__btn--icon"
                        title="View recruiter">
                        <i class="bi bi-eye"></i>
                      </a>
                      <button class="tbl-actions__btn tbl-actions__btn--edit tbl-actions__btn--icon"
                        (click)="openEdit(rec)" title="Edit recruiter">
                        <i class="bi bi-pencil"></i>
                      </button>
                      <div class="tbl-actions__sep"></div>
                      <button class="tbl-actions__btn tbl-actions__btn--token"
                        (click)="resendCredentials(rec)" [disabled]="resendLoading === rec.id"
                        title="Resend login credentials">
                        @if (resendLoading === rec.id) {
                          <span class="spinner-border spinner-border-sm"></span>
                        } @else {
                          <i class="bi bi-envelope"></i>
                        }
                        Resend
                      </button>
                      <div class="tbl-actions__sep"></div>
                      <button class="tbl-actions__btn tbl-actions__btn--danger tbl-actions__btn--icon"
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

    <!-- ── Edit Recruiter Panel (slide-in overlay) ── -->
    @if (editingRecruiter) {
      <div class="file-preview-overlay" (click)="closeEdit()">
        <div class="edit-panel" (click)="$event.stopPropagation()">
          <div class="edit-panel__header">
            <div>
              <div class="fw-bold">Edit Recruiter</div>
              <div class="text-muted small">{{ editingRecruiter.email }}</div>
            </div>
            <button type="button" class="file-preview-dialog__close" (click)="closeEdit()">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
          <div class="edit-panel__body">
            <form [formGroup]="editForm" (ngSubmit)="saveEdit()">
              <div class="mb-3">
                <label class="form-label fw-semibold">Contact Name <span class="text-danger">*</span></label>
                <input formControlName="contact_name" class="form-control"
                  [class.is-invalid]="editInvalid('contact_name')">
                @if (editInvalid('contact_name')) {
                  <div class="invalid-feedback">Contact name is required.</div>
                }
              </div>
              <div class="mb-4">
                <label class="form-label fw-semibold">Company Name</label>
                <input formControlName="company_name" class="form-control" placeholder="Optional">
              </div>
              @if (editError) {
                <div class="alert alert-danger small py-2">{{ editError }}</div>
              }
              <div class="d-flex gap-2">
                <button type="button" class="btn btn-outline-secondary flex-grow-1" (click)="closeEdit()">
                  Cancel
                </button>
                <button type="submit" class="btn btn-primary flex-grow-1" [disabled]="editSaving">
                  @if (editSaving) {
                    <span class="spinner-border spinner-border-sm me-1"></span> Saving…
                  } @else {
                    <i class="bi bi-check-lg me-1"></i> Save
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    }
  `,
})
export class RecruiterListComponent implements OnInit {
  recruiters: Recruiter[] = [];
  pagination = { page: 1, limit: 20, total: 0, pages: 0 };
  loading = false;
  resendLoading: string | null = null;

  filterForm: FormGroup;

  // Edit panel state
  editingRecruiter: Recruiter | null = null;
  editForm!: FormGroup;
  editSaving = false;
  editError  = '';

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

  // ── Edit panel ─────────────────────────────────────────────────────────────
  openEdit(rec: Recruiter): void {
    this.editingRecruiter = rec;
    this.editError        = '';
    this.editForm = this.fb.group({
      contact_name: [rec.contact_name, Validators.required],
      company_name: [rec.company_name ?? ''],
    });
  }

  closeEdit(): void {
    this.editingRecruiter = null;
    this.editSaving       = false;
    this.editError        = '';
  }

  editInvalid(field: string): boolean {
    const c = this.editForm?.get(field);
    return !!(c && c.invalid && c.touched);
  }

  saveEdit(): void {
    if (this.editForm.invalid) { this.editForm.markAllAsTouched(); return; }
    if (!this.editingRecruiter) return;
    this.editSaving = true;
    this.editError  = '';
    const val = this.editForm.value;
    this.recruiterService.update(this.editingRecruiter.id, {
      contact_name: val.contact_name,
      company_name: val.company_name || undefined,
    }).subscribe({
      next: () => {
        this.editSaving = false;
        this.toast.success('Recruiter updated');
        this.closeEdit();
        this.load();
      },
      error: (err) => {
        this.editSaving = false;
        this.editError  = err?.error?.message ?? 'Failed to update recruiter.';
      },
    });
  }

  resendCredentials(rec: Recruiter): void {
    this.resendLoading = rec.id;
    this.recruiterService.resendCredentials(rec.id).subscribe({
      next: () => {
        this.resendLoading = null;
        this.toast.success(`Credentials resent to ${rec.email}`);
      },
      error: (err) => {
        this.resendLoading = null;
        this.toast.error(err?.error?.message ?? 'Failed to resend credentials');
      },
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
