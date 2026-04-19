// src/app/features/admin/recruiter-list/recruiter-list.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { RecruiterService } from '../../../core/services/recruiter.service';
import { Recruiter } from '../../../core/models/recruiter.model';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

function passwordsMatchValidator(g: AbstractControl): ValidationErrors | null {
  const pw  = g.get('new_password')?.value;
  const cpw = g.get('confirm_password')?.value;
  if (!pw) return null; // password optional — no match check if empty
  return pw === cpw ? null : { passwordsMismatch: true };
}

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

    <!-- Filter card -->
    <div class="filter-card">
      <form [formGroup]="filterForm" (ngSubmit)="search()">

        <!-- Basic row -->
        <div class="filter-card__search-row">
          <div class="filter-card__search-input-wrap">
            <i class="bi bi-search"></i>
            <input type="text" class="form-control form-control-sm"
              formControlName="search"
              placeholder="Search name, company, email…"
              (keydown.enter)="search()">
          </div>
          <div class="filter-card__actions">
            <button type="submit" class="filter-search-btn">
              <i class="bi bi-search"></i> Search
            </button>
            <button type="button" class="filter-card__adv-toggle"
              [class.is-open]="advOpen"
              (click)="advOpen = !advOpen">
              <i class="bi bi-sliders2"></i>
              Advanced
              @if (activeAdvCount > 0) {
                <span class="filter-card__badge">{{ activeAdvCount }}</span>
              }
              <i class="bi bi-chevron-down adv-toggle__caret"></i>
            </button>
            @if (hasAnyFilter) {
              <button type="button" class="filter-clear-btn" (click)="clearFilters()">
                <i class="bi bi-x-lg"></i> Clear
              </button>
            }
          </div>
        </div>

        <!-- Advanced panel -->
        <div class="filter-card__advanced" [class.is-open]="advOpen">
          <div class="filter-card__advanced-inner">
            <div class="row g-2">
              <div class="col-sm-6 col-md-4 col-lg-3">
                <label class="filter-card__section-label">Company Name</label>
                <input type="text" class="form-control form-control-sm"
                  formControlName="company" placeholder="e.g. Acme Corp">
              </div>
              <div class="col-sm-6 col-md-4 col-lg-3">
                <label class="filter-card__section-label">Status</label>
                <select class="form-select form-select-sm" formControlName="isActive">
                  <option value="">All Statuses</option>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            </div>
            <div class="mt-3 d-flex gap-2">
              <button type="submit" class="filter-search-btn">
                <i class="bi bi-search"></i> Apply Filters
              </button>
              @if (hasAnyFilter) {
                <button type="button" class="filter-clear-btn" (click)="clearFilters()">
                  <i class="bi bi-x-lg"></i> Clear All
                </button>
              }
            </div>
          </div>
        </div>

      </form>
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
                <th class="small">#</th>
                <th class="small">Name</th>
                <th class="small">Company</th>
                <th class="small">Email</th>
                <th class="small">Expires</th>
                <th class="small">Status</th>
                <th class="small">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (rec of recruiters; track rec.id) {
                <tr>
                  <td>
                    @if (rec.recruiter_number) {
                      <span class="autocode-badge">{{ rec.recruiter_number }}</span>
                    }
                  </td>
                  <td class="fw-semibold small">{{ rec.contact_name }}</td>
                  <td class="small text-muted">{{ rec.company_name || '—' }}</td>
                  <td class="small">{{ rec.email }}</td>
                  <td class="small">
                    <span [class.text-danger]="isExpired(rec.access_expires_at)"
                          [class.text-muted]="!isExpired(rec.access_expires_at)">
                      {{ rec.access_expires_at | date:'dd MMM yyyy' }}
                      @if (isExpired(rec.access_expires_at)) {
                        <span class="badge bg-danger ms-1">Expired</span>
                      }
                    </span>
                  </td>
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
                        (click)="resendCredentials(rec)"
                        title="Resend login credentials">
                        <i class="bi bi-envelope"></i>
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
        <div class="rec-edit-panel" (click)="$event.stopPropagation()">

          <!-- Header -->
          <div class="rec-edit-panel__header">
            <div class="rec-edit-panel__avatar">
              {{ editingRecruiter.contact_name.charAt(0).toUpperCase() }}
            </div>
            <div class="rec-edit-panel__title-group">
              <div class="rec-edit-panel__title">Edit Recruiter</div>
              <div class="rec-edit-panel__subtitle">{{ editingRecruiter.contact_name }}</div>
            </div>
            <button type="button" class="file-preview-dialog__close" (click)="closeEdit()">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>

          <!-- Scrollable body -->
          <div class="rec-edit-panel__body">
            <form [formGroup]="editForm" (ngSubmit)="saveEdit()">

              <!-- ── Section: Profile ── -->
              <div class="rep-section">
                <div class="rep-section__label">
                  <i class="bi bi-person"></i> Profile
                </div>
                <div class="mb-3">
                  <label class="form-label">Contact Name <span class="text-danger">*</span></label>
                  <input formControlName="contact_name" class="form-control"
                    placeholder="Full name"
                    [class.is-invalid]="editInvalid('contact_name')">
                  @if (editInvalid('contact_name')) {
                    <div class="invalid-feedback">Contact name is required.</div>
                  }
                </div>
                <div class="mb-0">
                  <label class="form-label">Company Name <span class="rep-optional">optional</span></label>
                  <input formControlName="company_name" class="form-control" placeholder="e.g. Acme Corp">
                </div>
              </div>

              <!-- ── Section: Access Expiry ── -->
              <div class="rep-section">
                <div class="rep-section__label">
                  <i class="bi bi-clock-history"></i> Extend Access
                </div>
                <div class="mb-2">
                  <label class="form-label">Duration <span class="rep-optional">leave blank to keep current</span></label>
                  <div class="rep-duration-row">
                    <input type="number" formControlName="duration_value" class="form-control rep-duration-num"
                      placeholder="e.g. 6" min="1">
                    <select formControlName="duration_unit" class="form-select rep-duration-unit">
                      <option value="">— Unit —</option>
                      <option value="hours">Hours</option>
                      <option value="days">Days</option>
                      <option value="weeks">Weeks</option>
                      <option value="months">Months</option>
                      <option value="years">Years</option>
                    </select>
                  </div>
                </div>
                @if (expiryPreview) {
                  <div class="rep-expiry-preview">
                    <i class="bi bi-calendar-check"></i>
                    New expiry: <strong>{{ expiryPreview }}</strong>
                  </div>
                } @else if (editingRecruiter.access_expires_at) {
                  <div class="rep-expiry-current" [class.rep-expiry-current--expired]="isExpired(editingRecruiter.access_expires_at)">
                    <i class="bi bi-calendar{{ isExpired(editingRecruiter.access_expires_at) ? '-x' : '2' }}"></i>
                    Current expiry: <strong>{{ editingRecruiter.access_expires_at | date:'dd MMM yyyy, HH:mm' }}</strong>
                    @if (isExpired(editingRecruiter.access_expires_at)) {
                      <span class="badge bg-danger ms-1" style="font-size:.65rem">Expired</span>
                    }
                  </div>
                }
              </div>

              <!-- ── Section: Credentials ── -->
              <div class="rep-section">
                <div class="rep-section__label">
                  <i class="bi bi-shield-lock"></i> Credentials
                </div>

                <!-- Current password (read-only) -->
                <div class="mb-3">
                  <label class="form-label">Current Password</label>
                  <div class="rep-pw-wrap">
                    <input [type]="showCurrentPw ? 'text' : 'password'"
                      class="form-control rep-pw-input"
                      [value]="editingRecruiter.plain_password ?? ''" readonly>
                    <button type="button" class="rep-pw-eye" (click)="showCurrentPw = !showCurrentPw"
                      [title]="showCurrentPw ? 'Hide' : 'Show'">
                      <i class="bi" [class.bi-eye]="!showCurrentPw" [class.bi-eye-slash]="showCurrentPw"></i>
                    </button>
                  </div>
                </div>

                <!-- New password -->
                <div class="mb-3">
                  <label class="form-label">New Password <span class="rep-optional">optional</span></label>
                  <div class="rep-pw-wrap">
                    <input [type]="showNewPw ? 'text' : 'password'" formControlName="new_password"
                      class="form-control rep-pw-input" placeholder="Min 8 characters"
                      [class.is-invalid]="editInvalid('new_password')">
                    <button type="button" class="rep-pw-eye" (click)="showNewPw = !showNewPw"
                      [title]="showNewPw ? 'Hide' : 'Show'">
                      <i class="bi" [class.bi-eye]="!showNewPw" [class.bi-eye-slash]="showNewPw"></i>
                    </button>
                  </div>
                  @if (editInvalid('new_password')) {
                    <div class="rep-field-error">Minimum 8 characters.</div>
                  }
                </div>

                <!-- Confirm password -->
                <div class="mb-0">
                  <label class="form-label">Confirm New Password</label>
                  <div class="rep-pw-wrap">
                    <input [type]="showConfirmPw ? 'text' : 'password'" formControlName="confirm_password"
                      class="form-control rep-pw-input" placeholder="Repeat new password"
                      [class.is-invalid]="editForm.hasError('passwordsMismatch') && editForm.get('confirm_password')?.touched">
                    <button type="button" class="rep-pw-eye" (click)="showConfirmPw = !showConfirmPw"
                      [title]="showConfirmPw ? 'Hide' : 'Show'">
                      <i class="bi" [class.bi-eye]="!showConfirmPw" [class.bi-eye-slash]="showConfirmPw"></i>
                    </button>
                  </div>
                  @if (editForm.hasError('passwordsMismatch') && editForm.get('confirm_password')?.touched) {
                    <div class="rep-field-error">Passwords do not match.</div>
                  }
                </div>
              </div>

              <!-- Error -->
              @if (editError) {
                <div class="alert alert-danger small py-2 mb-3">
                  <i class="bi bi-exclamation-triangle me-1"></i>{{ editError }}
                </div>
              }

              <!-- Footer actions -->
              <div class="rec-edit-panel__footer">
                <button type="button" class="btn btn-outline-secondary" (click)="closeEdit()">
                  Cancel
                </button>
                <button type="submit" class="btn btn-primary" [disabled]="editSaving">
                  @if (editSaving) {
                    <span class="spinner-border spinner-border-sm me-1"></span> Saving…
                  } @else {
                    <i class="bi bi-check-lg me-1"></i> Save Changes
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
  advOpen = false;

  filterForm: FormGroup;

  // Edit panel state
  editingRecruiter: Recruiter | null = null;
  editForm!: FormGroup;
  editSaving = false;
  editError  = '';
  showCurrentPw = false;
  showNewPw     = false;
  showConfirmPw = false;

  constructor(
    private fb: FormBuilder,
    private recruiterService: RecruiterService,
    private toast: ToastService,
    private confirm: ConfirmDialogService,
  ) {
    this.filterForm = this.fb.group({
      search:   [''],
      company:  [''],
      isActive: [''],
    });
  }

  ngOnInit(): void {
    this.load();
  }

  get activeAdvCount(): number {
    const v = this.filterForm.value;
    return [v.company, v.isActive].filter(x => x !== null && x !== '' && x !== undefined).length;
  }

  get hasAnyFilter(): boolean {
    const v = this.filterForm.value;
    return Object.values(v).some(x => x !== null && x !== '' && x !== undefined);
  }

  isExpired(dateStr: string): boolean {
    return new Date(dateStr) < new Date();
  }

  get expiryPreview(): string {
    const val  = this.editForm?.get('duration_value')?.value;
    const unit = this.editForm?.get('duration_unit')?.value;
    if (!val || !unit || val < 1) return '';
    const dt = this.computeExpiry(val, unit);
    return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  private computeExpiry(value: number, unit: string): Date {
    const dt = new Date();
    switch (unit) {
      case 'hours':  dt.setHours(dt.getHours() + value);        break;
      case 'days':   dt.setDate(dt.getDate() + value);           break;
      case 'weeks':  dt.setDate(dt.getDate() + value * 7);       break;
      case 'months': dt.setMonth(dt.getMonth() + value);         break;
      case 'years':  dt.setFullYear(dt.getFullYear() + value);   break;
    }
    return dt;
  }

  search(): void {
    this.pagination.page = 1;
    this.load();
  }

  load(): void {
    this.loading = true;
    const v = this.filterForm.value;
    this.recruiterService.list({
      search:   v.search   || undefined,
      company:  v.company  || undefined,
      isActive: v.isActive || undefined,
      page:     this.pagination.page,
      limit:    this.pagination.limit,
    })
      .pipe(catchError(() => of(null)))
      .subscribe((res) => {
        this.loading = false;
        if (res) {
          this.recruiters  = res.data;
          this.pagination  = res.pagination;
        }
      });
  }

  clearFilters(): void {
    this.filterForm.reset({ search: '', company: '', isActive: '' });
    this.pagination.page = 1;
    this.load();
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
    this.showCurrentPw    = false;
    this.showNewPw        = false;
    this.showConfirmPw    = false;
    this.editForm = this.fb.group({
      contact_name:    [rec.contact_name, Validators.required],
      company_name:    [rec.company_name ?? ''],
      duration_value:  [null as number | null],
      duration_unit:   [''],
      new_password:    ['', [Validators.minLength(8)]],
      confirm_password:[''],
    }, { validators: passwordsMatchValidator });
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
    const payload: Record<string, unknown> = {
      contact_name: val.contact_name,
      company_name: val.company_name || null,
    };

    if (val.new_password) payload['new_password'] = val.new_password;

    if (val.duration_value && val.duration_unit) {
      payload['access_expires_at'] = this.computeExpiry(val.duration_value, val.duration_unit).toISOString();
    }

    this.recruiterService.update(this.editingRecruiter.id, payload as any).subscribe({
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

  // ── Resend credentials ──────────────────────────────────────────────────────
  async resendCredentials(rec: Recruiter): Promise<void> {
    const ok = await this.confirm.confirm({
      title: 'Resend Credentials',
      message: `Resend login credentials to ${rec.email}?`,
      confirmLabel: 'Send',
      confirmClass: 'btn-primary',
    });
    if (!ok) return;
    this.recruiterService.resendCredentials(rec.id).subscribe({
      next: () => this.toast.success(`Credentials sent to ${rec.email}`),
      error: (err) => this.toast.error(err?.error?.message ?? 'Failed to resend credentials'),
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
