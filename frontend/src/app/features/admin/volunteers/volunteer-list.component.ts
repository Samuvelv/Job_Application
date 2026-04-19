// src/app/features/admin/volunteers/volunteer-list.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { catchError, of } from 'rxjs';
import { VolunteerService } from '../../../core/services/volunteer.service';
import { Volunteer } from '../../../core/models/volunteer.model';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-volunteer-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PageHeaderComponent, EmptyStateComponent],
  template: `
    <app-page-header
      title="Volunteers"
      [subtitle]="pagination.total + ' volunteers'"
      icon="bi-people-fill">
      <button class="btn btn-primary btn-sm" (click)="openAdd()">
        <i class="bi bi-person-plus me-1"></i>Add Volunteer
      </button>
    </app-page-header>

    <!-- Search bar -->
    <div class="filter-card mb-3">
      <div class="filter-card__search-row">
        <div class="filter-card__search-input-wrap">
          <i class="bi bi-search"></i>
          <input type="text" class="form-control form-control-sm"
            [value]="searchTerm"
            (input)="onSearch($event)"
            placeholder="Search name, role, email…">
        </div>
        <div class="filter-card__actions">
          @if (searchTerm) {
            <button type="button" class="filter-clear-btn" (click)="clearSearch()">
              <i class="bi bi-x-lg"></i> Clear
            </button>
          }
        </div>
      </div>
    </div>

    <!-- Loading -->
    @if (loading) {
      <div class="loading-state">
        <div class="spinner-border"></div>
        <div class="loading-state__text">Loading volunteers…</div>
      </div>

    <!-- Empty -->
    } @else if (volunteers.length === 0) {
      <app-empty-state
        icon="bi-people"
        title="No volunteers yet"
        subtitle="Add your first volunteer to get started."
      />

    <!-- Table -->
    } @else {
      <div class="section-card">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead class="table-light">
              <tr>
                <th class="small">Name</th>
                <th class="small">Role / Skills</th>
                <th class="small">Email</th>
                <th class="small">Phone</th>
                <th class="small">Notes</th>
                <th class="small">Added</th>
                <th class="small">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (v of volunteers; track v.id) {
                <tr>
                  <td class="fw-semibold small">{{ v.name }}</td>
                  <td>
                    @if (v.role) {
                      <span class="vol-role-chip">{{ v.role }}</span>
                    } @else {
                      <span class="text-muted small">—</span>
                    }
                  </td>
                  <td class="small">
                    @if (v.email) {
                      <a [href]="'mailto:' + v.email" class="text-decoration-none">{{ v.email }}</a>
                    } @else { <span class="text-muted">—</span> }
                  </td>
                  <td class="small">{{ v.phone || '—' }}</td>
                  <td class="small text-muted" style="max-width:200px">
                    <span class="vol-notes-clamp">{{ v.notes || '—' }}</span>
                  </td>
                  <td class="small text-muted">{{ v.created_at | date:'dd MMM yyyy' }}</td>
                  <td>
                    <div class="tbl-actions">
                      <button class="tbl-actions__btn tbl-actions__btn--edit tbl-actions__btn--icon"
                        (click)="openEdit(v)" title="Edit">
                        <i class="bi bi-pencil"></i>
                      </button>
                      <button class="tbl-actions__btn tbl-actions__btn--danger tbl-actions__btn--icon"
                        (click)="deleteVolunteer(v)" title="Delete">
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

    <!-- ── Add / Edit Panel ── -->
    @if (panelOpen) {
      <div class="file-preview-overlay" (click)="closePanel()">
        <div class="rec-edit-panel" (click)="$event.stopPropagation()">

          <div class="rec-edit-panel__header">
            <div class="rec-edit-panel__avatar" style="background:var(--th-gradient-success)">
              <i class="bi bi-person-fill" style="font-size:.9rem"></i>
            </div>
            <div class="rec-edit-panel__title-group">
              <div class="rec-edit-panel__title">{{ editingVolunteer ? 'Edit Volunteer' : 'Add Volunteer' }}</div>
              <div class="rec-edit-panel__subtitle">
                {{ editingVolunteer ? editingVolunteer.name : 'New entry' }}
              </div>
            </div>
            <button type="button" class="file-preview-dialog__close" (click)="closePanel()">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>

          <div class="rec-edit-panel__body">
            <form [formGroup]="form" (ngSubmit)="save()">

              <!-- Details section -->
              <div class="rep-section">
                <div class="rep-section__label"><i class="bi bi-person"></i> Details</div>

                <div class="mb-3">
                  <label class="form-label">Name <span class="text-danger">*</span></label>
                  <input formControlName="name" class="form-control" placeholder="Full name"
                    [class.is-invalid]="invalid('name')">
                  @if (invalid('name')) {
                    <div class="invalid-feedback">Name is required.</div>
                  }
                </div>

                <div class="mb-3">
                  <label class="form-label">Role / Skills <span class="rep-optional">optional</span></label>
                  <input formControlName="role" class="form-control"
                    placeholder="e.g. Frontend Developer, Mentorship">
                </div>

                <div class="mb-3">
                  <label class="form-label">Email <span class="rep-optional">optional</span></label>
                  <input formControlName="email" class="form-control" type="email"
                    placeholder="volunteer@example.com"
                    [class.is-invalid]="invalid('email')">
                  @if (invalid('email')) {
                    <div class="invalid-feedback">Enter a valid email address.</div>
                  }
                </div>

                <div class="mb-0">
                  <label class="form-label">Phone <span class="rep-optional">optional</span></label>
                  <input formControlName="phone" class="form-control" placeholder="+1 555 000 0000">
                </div>
              </div>

              <!-- Notes section -->
              <div class="rep-section">
                <div class="rep-section__label"><i class="bi bi-chat-left-text"></i> Notes</div>
                <textarea formControlName="notes" class="form-control" rows="3"
                  placeholder="Any relevant notes about this volunteer…"></textarea>
              </div>

              @if (saveError) {
                <div class="alert alert-danger small py-2 mb-3">
                  <i class="bi bi-exclamation-triangle me-1"></i>{{ saveError }}
                </div>
              }

              <div class="rec-edit-panel__footer">
                <button type="button" class="btn btn-outline-secondary" (click)="closePanel()">
                  Cancel
                </button>
                <button type="submit" class="btn btn-primary" [disabled]="saving">
                  @if (saving) {
                    <span class="spinner-border spinner-border-sm me-1"></span>Saving…
                  } @else {
                    <i class="bi bi-check-lg me-1"></i>{{ editingVolunteer ? 'Save Changes' : 'Add Volunteer' }}
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
export class VolunteerListComponent implements OnInit {
  volunteers: Volunteer[] = [];
  pagination = { page: 1, limit: 20, total: 0, pages: 0 };
  loading = false;
  searchTerm = '';
  private searchTimer: any;

  panelOpen = false;
  editingVolunteer: Volunteer | null = null;
  form!: FormGroup;
  saving = false;
  saveError = '';

  constructor(
    private fb: FormBuilder,
    private volunteerSvc: VolunteerService,
    private toast: ToastService,
    private confirm: ConfirmDialogService,
  ) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.volunteerSvc.list({
      search: this.searchTerm || undefined,
      page:   this.pagination.page,
      limit:  this.pagination.limit,
    }).pipe(catchError(() => of(null))).subscribe((res) => {
      this.loading = false;
      if (res) { this.volunteers = res.data; this.pagination = res.pagination; }
    });
  }

  onSearch(e: Event): void {
    this.searchTerm = (e.target as HTMLInputElement).value;
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => { this.pagination.page = 1; this.load(); }, 350);
  }

  clearSearch(): void { this.searchTerm = ''; this.pagination.page = 1; this.load(); }

  goToPage(page: number): void {
    if (page < 1 || page > this.pagination.pages) return;
    this.pagination.page = page; this.load();
  }

  pageNumbers(): number[] {
    const { page, pages } = this.pagination;
    const start = Math.max(1, page - 2);
    const end   = Math.min(pages, page + 2);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  invalid(field: string): boolean {
    const c = this.form?.get(field);
    return !!(c && c.invalid && c.touched);
  }

  openAdd(): void {
    this.editingVolunteer = null;
    this.saveError = '';
    this.form = this.fb.group({
      name:  ['', Validators.required],
      role:  [''],
      email: ['', Validators.email],
      phone: [''],
      notes: [''],
    });
    this.panelOpen = true;
  }

  openEdit(v: Volunteer): void {
    this.editingVolunteer = v;
    this.saveError = '';
    this.form = this.fb.group({
      name:  [v.name,        Validators.required],
      role:  [v.role  ?? ''],
      email: [v.email ?? '', Validators.email],
      phone: [v.phone ?? ''],
      notes: [v.notes ?? ''],
    });
    this.panelOpen = true;
  }

  closePanel(): void { this.panelOpen = false; this.editingVolunteer = null; this.saving = false; }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    this.saveError = '';

    const raw = this.form.value;
    const payload = {
      name:  raw.name.trim(),
      role:  raw.role?.trim()  || undefined,
      email: raw.email?.trim() || undefined,
      phone: raw.phone?.trim() || undefined,
      notes: raw.notes?.trim() || undefined,
    };

    const req$ = this.editingVolunteer
      ? this.volunteerSvc.update(this.editingVolunteer.id, payload)
      : this.volunteerSvc.create(payload);

    req$.subscribe({
      next: () => {
        this.saving = false;
        this.toast.success(this.editingVolunteer ? 'Volunteer updated' : 'Volunteer added');
        this.closePanel();
        this.load();
      },
      error: (err) => {
        this.saving = false;
        this.saveError = err?.error?.message ?? 'Failed to save volunteer.';
      },
    });
  }

  async deleteVolunteer(v: Volunteer): Promise<void> {
    const ok = await this.confirm.confirm({
      title: 'Delete Volunteer',
      message: `Remove ${v.name} from the volunteer list?`,
      confirmLabel: 'Delete',
      confirmClass: 'btn-danger',
    });
    if (!ok) return;
    this.volunteerSvc.delete(v.id).subscribe({
      next: () => { this.toast.success('Volunteer removed'); this.load(); },
      error: (err) => this.toast.error(err?.error?.message ?? 'Failed to delete'),
    });
  }
}
