// src/app/features/admin/edit-requests/edit-requests.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { EditRequestService } from '../../../core/services/edit-request.service';
import { EditRequest } from '../../../core/models/edit-request.model';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-edit-requests',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PageHeaderComponent, EmptyStateComponent],
  template: `
    <div class="d-flex justify-content-between align-items-start mb-4">
      <app-page-header
        title="Edit Requests"
        [subtitle]="pagination.total + ' total requests'"
        icon="bi-pencil-square"
        class="flex-grow-1"
      />
    </div>

    <!-- Status filter tabs -->
    <ul class="nav nav-pills mb-4">
      @for (tab of tabs; track tab.value) {
        <li class="nav-item">
          <button class="nav-link me-1"
            [class.active]="activeStatus === tab.value"
            (click)="setStatus(tab.value)">
            {{ tab.label }}
          </button>
        </li>
      }
    </ul>

    @if (loading) {
      <div class="text-center py-5"><div class="spinner-border text-primary"></div></div>
    } @else if (requests.length === 0) {
      <app-empty-state
        icon="bi-inbox"
        title="No edit requests found"
        subtitle="Edit requests submitted by employees will appear here."
      />
    } @else {
      <div class="d-flex flex-column gap-3">
        @for (req of requests; track req.id) {
          <div class="card p-4">
            <!-- Header row -->
            <div class="d-flex justify-content-between align-items-start mb-3">
              <div>
                <span class="fw-semibold">{{ req.first_name }} {{ req.last_name }}</span>
                <span class="text-muted small ms-2">{{ req.email }}</span>
                <div class="text-muted small mt-1">
                  <i class="bi bi-clock me-1"></i>Submitted {{ req.created_at | date:'dd MMM yyyy, HH:mm' }}
                  @if (req.reviewed_at) { · Reviewed {{ req.reviewed_at | date:'dd MMM yyyy' }} }
                </div>
              </div>
              <span class="badge rounded-pill px-3 py-2"
                [class.bg-warning]="req.status === 'pending'"
                [class.text-dark]="req.status === 'pending'"
                [class.bg-success]="req.status === 'approved'"
                [class.bg-danger]="req.status === 'rejected'">
                {{ req.status | titlecase }}
              </span>
            </div>

            <!-- Requested changes diff -->
            <div class="mb-3">
              <h6 class="small fw-bold text-muted text-uppercase mb-2">Requested Changes</h6>
              <div class="bg-light rounded p-3 small" style="max-height:280px;overflow-y:auto">
                <table class="table table-sm table-borderless mb-0">
                  <tbody>
                    @for (entry of getChanges(req); track entry.key) {
                      <tr>
                        <td class="fw-semibold text-muted pe-3" style="width:180px">{{ entry.label }}</td>
                        <td>{{ entry.display }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>

            @if (req.admin_note) {
              <div class="alert alert-light py-2 small mb-3">
                <i class="bi bi-chat-left-text me-1"></i>
                <strong>Admin note:</strong> {{ req.admin_note }}
              </div>
            }

            <!-- Review panel — only for pending -->
            @if (req.status === 'pending') {
              @if (reviewingId === req.id) {
                <div class="border rounded p-3 bg-light" [formGroup]="reviewForm">
                  <div class="mb-3">
                    <label class="form-label small fw-semibold">Admin Note (optional)</label>
                    <textarea formControlName="admin_note" class="form-control form-control-sm"
                      rows="2" placeholder="Reason for rejection, or approval comment…"></textarea>
                  </div>
                  <div class="d-flex gap-2">
                    <button class="btn btn-sm btn-success" (click)="confirmReview(req.id, 'approved')"
                      [disabled]="reviewSubmitting">
                      <i class="bi bi-check2 me-1"></i>{{ reviewSubmitting ? '…' : 'Approve' }}
                    </button>
                    <button class="btn btn-sm btn-danger" (click)="confirmReview(req.id, 'rejected')"
                      [disabled]="reviewSubmitting">
                      <i class="bi bi-x me-1"></i>{{ reviewSubmitting ? '…' : 'Reject' }}
                    </button>
                    <button class="btn btn-sm btn-outline-secondary" (click)="cancelReview()">Cancel</button>
                  </div>
                </div>
              } @else {
                <button class="btn btn-sm btn-outline-primary" (click)="startReview(req.id)">
                  <i class="bi bi-eye me-1"></i>Review
                </button>
              }
            }

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
  `,
})
export class EditRequestsComponent implements OnInit {
  requests: EditRequest[] = [];
  pagination = { page: 1, limit: 10, total: 0, pages: 0 };
  loading = false;
  activeStatus: string = 'pending';

  reviewingId: string | null = null;
  reviewForm: FormGroup;
  reviewSubmitting = false;

  tabs = [
    { label: 'Pending',  value: 'pending'  },
    { label: 'Approved', value: 'approved' },
    { label: 'Rejected', value: 'rejected' },
    { label: 'All',      value: ''         },
  ];

  private readonly fieldLabels: Record<string, string> = {
    first_name: 'First Name', last_name: 'Last Name', phone: 'Phone',
    date_of_birth: 'Date of Birth', gender: 'Gender', bio: 'Bio',
    linkedin_url: 'LinkedIn', job_title: 'Job Title', occupation: 'Occupation',
    industry: 'Industry', years_experience: 'Yrs Experience',
    current_country: 'Country', current_city: 'City', nationality: 'Nationality',
    salary_min: 'Salary Min', salary_max: 'Salary Max',
    salary_currency: 'Currency', salary_type: 'Salary Type',
    skills: 'Skills', languages: 'Languages',
    experience: 'Work Experience', education: 'Education',
  };

  constructor(
    private fb: FormBuilder,
    private editRequestService: EditRequestService,
    private toast: ToastService,
  ) {
    this.reviewForm = this.fb.group({ admin_note: [''] });
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    const filters = {
      status: this.activeStatus as 'pending' | 'approved' | 'rejected' | undefined || undefined,
      page:   this.pagination.page,
      limit:  this.pagination.limit,
    };
    this.editRequestService.list(filters).subscribe({
      next: (res) => {
        this.loading    = false;
        this.requests   = res.data;
        this.pagination = res.pagination;
      },
      error: () => (this.loading = false),
    });
  }

  setStatus(status: string): void {
    this.activeStatus    = status;
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

  getChanges(req: EditRequest): { key: string; label: string; display: string }[] {
    const data = req.requested_data ?? {};
    return Object.entries(data)
      .filter(([k]) => k !== 'id' && k !== 'user_id')
      .map(([k, v]) => ({
        key:     k,
        label:   this.fieldLabels[k] ?? k,
        display: Array.isArray(v) ? JSON.stringify(v) : String(v ?? '—'),
      }));
  }

  startReview(id: string): void {
    this.reviewingId = id;
    this.reviewForm.reset();
  }

  cancelReview(): void {
    this.reviewingId = null;
  }

  confirmReview(id: string, status: 'approved' | 'rejected'): void {
    this.reviewSubmitting = true;
    const admin_note = this.reviewForm.value.admin_note || undefined;
    this.editRequestService.review(id, { status, admin_note }).subscribe({
      next: () => {
        this.reviewSubmitting = false;
        this.reviewingId      = null;
        this.toast.success(`Request ${status}`);
        this.load();
      },
      error: (err) => {
        this.reviewSubmitting = false;
        this.toast.error(err?.error?.message ?? 'Failed to review');
      },
    });
  }
}
