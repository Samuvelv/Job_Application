// src/app/features/admin/master/master-management.component.ts
// Config-driven master data list + CRUD page for all 10 master tables.
// Route: /admin/master/:tableKey
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';

import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { MasterFormModalComponent } from './master-form-modal.component';
import { MASTER_CONFIG_BY_KEY, MasterTableConfig } from './master-table.config';
import { AdminMasterService, MasterRecord } from '../../../core/services/admin-master.service';
import { MasterDataService } from '../../../core/services/master-data.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';

@Component({
  selector: 'app-master-management',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    PageHeaderComponent,
    MasterFormModalComponent,
  ],
  template: `
    @if (!config) {
      <div class="empty-state">
        <div class="empty-state__icon"><i class="bi bi-exclamation-triangle"></i></div>
        <h5 class="empty-state-title">Unknown master table</h5>
        <p class="empty-state-message">The requested table does not exist.</p>
      </div>
    } @else {

      <!-- Page Header -->
      <app-page-header
        [title]="config.label"
        [subtitle]="pagination.total + ' total records'"
        [icon]="config.icon"
      >
        <button class="btn btn-sm btn-outline-secondary"
          (click)="toggleDeleted()">
          <i class="bi me-1" [class]="showDeleted ? 'bi-eye-slash' : 'bi-eye'"></i>
          {{ showDeleted ? 'Hide Deleted' : 'Show Deleted' }}
        </button>
        <button class="btn btn-sm btn-primary" (click)="openCreate()">
          <i class="bi bi-plus-lg me-1"></i>Add New
        </button>
      </app-page-header>

      <!-- Search bar -->
      <div class="filter-card">
        <div class="row g-2 align-items-center">
          <div class="col-md-5">
            <div class="position-relative">
              <i class="bi bi-search position-absolute" style="left:.75rem;top:50%;transform:translateY(-50%);color:var(--th-muted);font-size:.85rem"></i>
              <input type="text" class="form-control form-control-sm"
                style="padding-left:2.2rem"
                placeholder="Search {{ config.labelPlural | lowercase }}…"
                [formControl]="searchCtrl">
            </div>
          </div>
          <div class="col-auto ms-auto">
            <span class="text-muted small">
              {{ pagination.total }} record{{ pagination.total !== 1 ? 's' : '' }}
              @if (showDeleted) { <span class="badge bg-warning text-dark ms-1">incl. deleted</span> }
            </span>
          </div>
        </div>
      </div>

      <!-- Loading -->
      @if (loading) {
        <div class="loading-state">
          <div class="spinner-border text-primary"></div>
          <div class="loading-state__text">Loading {{ config.labelPlural | lowercase }}…</div>
        </div>
      }

      <!-- Empty -->
      @if (!loading && records.length === 0) {
        <div class="empty-state">
          <div class="empty-state__icon"><i class="bi" [class]="config.icon"></i></div>
          <h5 class="empty-state-title">No {{ config.labelPlural | lowercase }} found</h5>
          @if (searchCtrl.value) {
            <p class="empty-state-message">Try clearing the search term.</p>
          } @else {
            <p class="empty-state-message">Click <strong>Add New</strong> to create the first record.</p>
          }
        </div>
      }

      <!-- Table -->
      @if (!loading && records.length > 0) {
        <div class="section-card">
          <div class="table-responsive">
            <table class="table table-hover align-middle mb-0 small mm-table">
              <thead class="table-light">
                <tr>
                  <th style="width:54px" class="text-center text-muted">#</th>
                  @for (field of config.fields; track field.key) {
                    <th class="sortable-col" (click)="toggleSort(field.key)">
                      {{ field.label }}
                      @if (sortBy === field.key) {
                        <i class="bi ms-1 small" [class]="sortDir === 'asc' ? 'bi-sort-up' : 'bi-sort-down'"></i>
                      }
                    </th>
                  }
                  <!-- Extra resolved columns -->
                  @if (config.table === 'master_job_titles') {
                    <th>Occupation</th>
                  }
                  @if (config.table === 'master_cities') {
                    <th>Country</th>
                  }
                  <th>Status</th>
                  <th>Created</th>
                  <th style="width:110px" class="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (rec of records; track rec.id; let i = $index) {
                  <tr [class.mm-row--deleted]="rec.deleted_at">
                    <td class="text-center text-muted" style="font-size:.75rem">
                      {{ (pagination.page - 1) * pagination.limit + i + 1 }}
                    </td>
                    @for (field of config.fields; track field.key) {
                      <td>
                        @if (field.key === 'flag_emoji') {
                          <span style="font-size:1.2rem">{{ rec[field.key] || '—' }}</span>
                        } @else if (field.type === 'select') {
                          <!-- Hide raw FK id; the resolved name column below shows the value -->
                          <span class="text-muted small">{{ rec[field.key] }}</span>
                        } @else {
                          <span [class.text-decoration-line-through]="rec.deleted_at && field.key === config.displayField"
                                [class.text-muted]="!!rec.deleted_at">
                            {{ rec[field.key] ?? '—' }}
                          </span>
                        }
                      </td>
                    }
                    <!-- Resolved FK name columns -->
                    @if (config.table === 'master_job_titles') {
                      <td class="text-muted">{{ rec['occupation_name'] || '—' }}</td>
                    }
                    @if (config.table === 'master_cities') {
                      <td class="text-muted">{{ rec['country_name'] || '—' }}</td>
                    }
                    <!-- Status badge -->
                    <td>
                      @if (rec.deleted_at) {
                        <span class="badge mm-badge--deleted">
                          <i class="bi bi-trash me-1"></i>Deleted
                        </span>
                      } @else {
                        <span class="badge mm-badge--active">
                          <i class="bi bi-check-circle me-1"></i>Active
                        </span>
                      }
                    </td>
                    <!-- Created date -->
                    <td class="text-muted text-nowrap" style="font-size:.75rem">
                      {{ rec.created_at ? (rec.created_at | date:'dd MMM yyyy') : '—' }}
                    </td>
                    <!-- Actions -->
                    <td class="text-end">
                      <div class="d-flex gap-1 justify-content-end">
                        @if (!rec.deleted_at) {
                          <button class="btn btn-xs btn-outline-primary"
                            title="Edit" (click)="openEdit(rec)">
                            <i class="bi bi-pencil"></i>
                          </button>
                          <button class="btn btn-xs btn-outline-danger"
                            title="Delete" (click)="onDelete(rec)">
                            <i class="bi bi-trash"></i>
                          </button>
                        } @else {
                          <button class="btn btn-xs btn-outline-success"
                            title="Restore" (click)="onRestore(rec)">
                            <i class="bi bi-arrow-counterclockwise"></i>
                          </button>
                        }
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Pagination -->
          @if (pagination.pages > 1) {
            <div class="d-flex justify-content-between align-items-center px-3 py-2 border-top">
              <small class="text-muted">
                Page {{ pagination.page }} of {{ pagination.pages }}
                ({{ pagination.total }} records)
              </small>
              <div class="d-flex gap-1">
                <button class="btn btn-sm btn-outline-secondary"
                  [disabled]="pagination.page === 1"
                  (click)="goToPage(pagination.page - 1)">&laquo;</button>
                @for (pg of pageRange(); track pg) {
                  <button class="btn btn-sm"
                    [class.btn-primary]="pg === pagination.page"
                    [class.btn-outline-secondary]="pg !== pagination.page"
                    (click)="goToPage(pg)">{{ pg }}</button>
                }
                <button class="btn btn-sm btn-outline-secondary"
                  [disabled]="pagination.page === pagination.pages"
                  (click)="goToPage(pagination.page + 1)">&raquo;</button>
              </div>
            </div>
          }
        </div>
      }

    }

    <!-- Form Modal -->
    @if (config) {
      <app-master-form-modal
        [config]="config"
        [record]="editRecord"
        [visible]="modalVisible"
        (saved)="onSaved($event)"
        (closed)="closeModal()"
      ></app-master-form-modal>
    }
  `,
  styles: [`
    .mm-table th { font-size: .75rem; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; color: var(--th-text-secondary); }
    .mm-table td { padding: .6rem .75rem; }
    .sortable-col { cursor: pointer; user-select: none; }
    .sortable-col:hover { color: var(--th-primary); }
    .mm-row--deleted td { opacity: .65; }
    .mm-badge--active  { background: var(--th-success-soft, #dcfce7); color: var(--th-success, #16a34a); font-weight: 500; font-size:.72rem; }
    .mm-badge--deleted { background: var(--th-danger-soft,  #fee2e2); color: var(--th-danger,  #dc2626); font-weight: 500; font-size:.72rem; }
    .btn-xs { padding: .2rem .45rem; font-size: .75rem; line-height: 1.4; }
  `],
})
export class MasterManagementComponent implements OnInit, OnDestroy {
  config:    MasterTableConfig | null = null;
  records:   MasterRecord[]    = [];
  loading    = true;
  showDeleted = false;

  pagination = { page: 1, limit: 25, total: 0, pages: 1 };
  sortBy   = '';
  sortDir: 'asc' | 'desc' = 'asc';

  searchCtrl = new FormControl('');
  modalVisible = false;
  editRecord:  MasterRecord | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private route:      ActivatedRoute,
    private adminSvc:   AdminMasterService,
    private masterData: MasterDataService,
    private toast:      ToastService,
    private confirm:    ConfirmDialogService,
  ) {}

  ngOnInit(): void {
    // React to route param changes (user navigates between master tables)
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const key = params.get('tableKey') ?? '';
      this.config      = MASTER_CONFIG_BY_KEY[key] ?? null;
      this.sortBy      = this.config?.defaultSort ?? 'name';
      this.sortDir     = 'asc';
      this.showDeleted = false;
      this.pagination  = { page: 1, limit: 25, total: 0, pages: 1 };
      this.searchCtrl.setValue('', { emitEvent: false });
      this.records = [];
      if (this.config) {
        // Load master data signals so FK selects are populated
        this.masterData.loadAll();
        this.load();
      }
    });

    // Debounced search
    this.searchCtrl.valueChanges.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      takeUntil(this.destroy$),
    ).subscribe(() => {
      this.pagination.page = 1;
      this.load();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(): void {
    if (!this.config) return;
    this.loading = true;
    this.adminSvc.list(this.config.table, {
      page:           this.pagination.page,
      limit:          this.pagination.limit,
      search:         this.searchCtrl.value ?? '',
      sortBy:         this.sortBy,
      sortDir:        this.sortDir,
      includeDeleted: this.showDeleted,
    }).subscribe({
      next: (res) => {
        this.records    = res.data;
        this.pagination = { ...this.pagination, ...res.pagination };
        this.loading    = false;
      },
      error: () => {
        this.toast.show('Failed to load records.', 'error');
        this.loading = false;
      },
    });
  }

  toggleSort(col: string): void {
    if (this.sortBy === col) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy  = col;
      this.sortDir = 'asc';
    }
    this.pagination.page = 1;
    this.load();
  }

  toggleDeleted(): void {
    this.showDeleted     = !this.showDeleted;
    this.pagination.page = 1;
    this.load();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.pagination.pages) return;
    this.pagination.page = page;
    this.load();
  }

  pageRange(): number[] {
    const { page, pages } = this.pagination;
    const start = Math.max(1, page - 2);
    const end   = Math.min(pages, page + 2);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  // ── Modal ─────────────────────────────────────────────────────────────────

  openCreate(): void {
    this.editRecord   = null;
    this.modalVisible = true;
  }

  openEdit(rec: MasterRecord): void {
    this.editRecord   = rec;
    this.modalVisible = true;
  }

  closeModal(): void {
    this.modalVisible = false;
    this.editRecord   = null;
  }

  onSaved(rec: MasterRecord): void {
    this.closeModal();
    this.load();
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  async onDelete(rec: MasterRecord): Promise<void> {
    if (!this.config) return;
    const label = rec[this.config.displayField] ?? `#${rec.id}`;
    const result = await this.confirm.confirm({
      title:        'Delete Record',
      message:      `Are you sure you want to delete "${label}"? It will be soft-deleted and can be restored later.`,
      confirmLabel: 'Delete',
      confirmClass: 'btn-danger',
      icon:         'bi-trash-fill',
    });
    if (!result.confirmed) return;

    this.adminSvc.delete(this.config.table, rec.id).subscribe({
      next: () => {
        this.toast.show(`"${label}" deleted.`, 'success');
        this.load();
      },
      error: (err) => this.toast.show(err?.error?.message ?? 'Delete failed.', 'error'),
    });
  }

  // ── Restore ───────────────────────────────────────────────────────────────

  async onRestore(rec: MasterRecord): Promise<void> {
    if (!this.config) return;
    const label = rec[this.config.displayField] ?? `#${rec.id}`;
    const result = await this.confirm.confirm({
      title:        'Restore Record',
      message:      `Restore "${label}" and make it active again?`,
      confirmLabel: 'Restore',
      confirmClass: 'btn-success',
      icon:         'bi-arrow-counterclockwise',
    });
    if (!result.confirmed) return;

    this.adminSvc.restore(this.config.table, rec.id).subscribe({
      next: () => {
        this.toast.show(`"${label}" restored.`, 'success');
        this.load();
      },
      error: (err) => this.toast.show(err?.error?.message ?? 'Restore failed.', 'error'),
    });
  }
}
