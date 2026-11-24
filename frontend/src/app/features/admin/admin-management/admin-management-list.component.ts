// src/app/features/admin/admin-management/admin-management-list.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { LocaleDatePipe } from '../../../core/pipes/locale-date.pipe';
import { AdminManagementService } from '../../../core/services/admin-management.service';
import { AdminAccount } from '../../../core/models/admin-management.model';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { AdminManagementFormModalComponent } from './admin-management-form-modal.component';

@Component({
  selector: 'app-admin-management-list',
  standalone: true,
  imports: [CommonModule, TranslateModule, ReactiveFormsModule, LocaleDatePipe, PageHeaderComponent, EmptyStateComponent, AdminManagementFormModalComponent],
  template: `
    <app-page-header
      title="Manage Admins"
      [subtitle]="pagination.total + ' admin account' + (pagination.total === 1 ? '' : 's')"
      icon="bi-person-gear">
      <button type="button" class="btn btn-primary" (click)="openCreateModal()">
        <i class="bi bi-person-plus me-1"></i>Add Admin
      </button>
    </app-page-header>

    <app-admin-management-form-modal
      [visible]="showCreateModal"
      (saved)="onCreated()"
      (closed)="closeCreateModal()" />

    <div class="cfs-topbar mb-3">
      <div class="cfs-topbar__search">
        <i class="bi bi-search"></i>
        <input type="text" class="form-control form-control-sm"
          [formControl]="searchCtrl"
          placeholder="Search by name or email"
          (keydown.enter)="load()">
      </div>
      <div class="cfs-topbar__actions">
        <button type="button" class="filter-search-btn" (click)="load()">
          <i class="bi bi-search"></i> Search
        </button>
      </div>
    </div>

    @if (loading) {
      <div class="text-center py-5">
        <span class="spinner-border"></span>
      </div>
    } @else if (admins.length === 0) {
      <app-empty-state
        icon="bi-person-gear"
        title="No admin accounts found"
        subtitle="Create your first admin account to get started.">
        <button type="button" class="btn btn-primary mt-2" (click)="openCreateModal()">Add Admin</button>
      </app-empty-state>
    } @else {
      <div class="table-responsive">
        <table class="table align-middle">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Status</th>
              <th>Created</th>
              <th class="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (admin of admins; track admin.id) {
              <tr>
                <td>{{ admin.first_name }} {{ admin.last_name || '' }}</td>
                <td>{{ admin.email }}</td>
                <td>
                  @if (admin.is_active) {
                    <span class="badge bg-success-subtle text-success">Active</span>
                  } @else {
                    <span class="badge bg-danger-subtle text-danger">Inactive</span>
                  }
                </td>
                <td>{{ admin.created_at | localeDate }}</td>
                <td class="text-end">
                  <div class="d-inline-flex gap-2">
                    <button type="button" class="btn btn-sm btn-outline-secondary" (click)="resetPassword(admin)">
                      <i class="bi bi-key"></i> Reset Password
                    </button>
                    @if (admin.is_active) {
                      <button type="button" class="btn btn-sm btn-outline-danger" (click)="toggleActive(admin)">
                        <i class="bi bi-slash-circle"></i> Deactivate
                      </button>
                    } @else {
                      <button type="button" class="btn btn-sm btn-outline-success" (click)="toggleActive(admin)">
                        <i class="bi bi-check-circle"></i> Reactivate
                      </button>
                    }
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      @if (pagination.pages > 1) {
        <nav class="d-flex justify-content-center gap-2 mt-3">
          <button class="btn btn-sm btn-outline-secondary" [disabled]="pagination.page <= 1" (click)="goToPage(pagination.page - 1)">Previous</button>
          <span class="align-self-center small text-muted">Page {{ pagination.page }} of {{ pagination.pages }}</span>
          <button class="btn btn-sm btn-outline-secondary" [disabled]="pagination.page >= pagination.pages" (click)="goToPage(pagination.page + 1)">Next</button>
        </nav>
      }
    }
  `,
})
export class AdminManagementListComponent implements OnInit {
  admins: AdminAccount[] = [];
  loading = true;
  searchCtrl = new FormControl('');
  pagination = { page: 1, limit: 20, total: 0, pages: 0 };
  showCreateModal = false;

  constructor(
    private svc: AdminManagementService,
    private toast: ToastService,
    private confirm: ConfirmDialogService,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.svc.list({ search: this.searchCtrl.value || undefined, page: this.pagination.page, limit: this.pagination.limit })
      .subscribe({
        next: (res) => {
          this.admins = res.data;
          this.pagination = res.pagination;
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.toast.error('Failed to load admin accounts.');
        },
      });
  }

  goToPage(page: number): void {
    this.pagination = { ...this.pagination, page };
    this.load();
  }

  openCreateModal(): void {
    this.showCreateModal = true;
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
  }

  onCreated(): void {
    this.showCreateModal = false;
    this.pagination.page = 1;
    this.load();
  }

  async toggleActive(admin: AdminAccount): Promise<void> {
    const deactivating = admin.is_active;
    const result = await this.confirm.confirm({
      title: deactivating ? 'Deactivate Admin' : 'Reactivate Admin',
      message: deactivating
        ? `Deactivate ${admin.first_name}'s account? They will no longer be able to log in.`
        : `Reactivate ${admin.first_name}'s account?`,
      confirmLabel: deactivating ? 'Deactivate' : 'Reactivate',
      variant: deactivating ? 'danger' : 'success',
    });
    if (!result.confirmed) return;

    const action$ = deactivating ? this.svc.deactivate(admin.id) : this.svc.reactivate(admin.id);
    action$.subscribe({
      next: () => {
        this.toast.success(deactivating ? 'Admin deactivated.' : 'Admin reactivated.');
        this.load();
      },
      error: (err) => this.toast.error(err?.error?.message ?? 'Action failed.'),
    });
  }

  async resetPassword(admin: AdminAccount): Promise<void> {
    const result = await this.confirm.confirm({
      title: 'Reset Password',
      message: `Generate a new password for ${admin.first_name} and email it to them?`,
      confirmLabel: 'Reset Password',
      variant: 'warning',
    });
    if (!result.confirmed) return;

    this.svc.resetPassword(admin.id).subscribe({
      next: () => this.toast.success('Password reset — new credentials emailed.'),
      error: (err) => this.toast.error(err?.error?.message ?? 'Failed to reset password.'),
    });
  }
}
