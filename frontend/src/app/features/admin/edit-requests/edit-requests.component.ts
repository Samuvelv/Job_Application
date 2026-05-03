// src/app/features/admin/edit-requests/edit-requests.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { EditRequestService } from '../../../core/services/edit-request.service';
import { ContactRequestService } from '../../../core/services/contact-request.service';
import { EditRequest } from '../../../core/models/edit-request.model';
import { ContactRequest } from '../../../core/models/contact-request.model';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { EditRequestCardComponent } from '../../../shared/components/edit-request-card/edit-request-card.component';

@Component({
  selector: 'app-edit-requests',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PageHeaderComponent, EmptyStateComponent, EditRequestCardComponent],
  template: `
    <app-page-header
      title="Requests"
      [subtitle]="activeSection === 'edit' ? (editPagination.total + ' edit requests') : (contactPagination.total + ' contact requests')"
      icon="bi-inbox-fill"
    />

    <!-- Section toggle -->
    <div class="req-section-toggle mb-4">
      <button class="req-section-btn"
        [class.active]="activeSection === 'edit'"
        (click)="setSection('edit')">
        <i class="bi bi-pencil-square"></i>
        Candidate Edit Requests
        @if (editPendingCount > 0) {
          <span class="req-section-badge">{{ editPendingCount }}</span>
        }
      </button>
      <button class="req-section-btn"
        [class.active]="activeSection === 'contact'"
        (click)="setSection('contact')">
        <i class="bi bi-person-lines-fill"></i>
        Contact Info Requests
        @if (contactPendingCount > 0) {
          <span class="req-section-badge">{{ contactPendingCount }}</span>
        }
      </button>
    </div>

    <!-- ── EDIT REQUESTS SECTION ── -->
    @if (activeSection === 'edit') {

      <!-- Status filter tabs -->
      <div class="nav-pills-custom mb-4">
        @for (tab of statusTabs; track tab.value) {
          <button class="nav-pill"
            [class.active]="editStatus === tab.value"
            (click)="setEditStatus(tab.value)">
            {{ tab.label }}
          </button>
        }
      </div>

      @if (editLoading) {
        <div class="loading-state">
          <div class="spinner-border"></div>
          <div class="loading-state__text">Loading requests…</div>
        </div>
      } @else if (editRequests.length === 0) {
        <app-empty-state
          icon="bi-inbox"
          title="No edit requests found"
          subtitle="Edit requests submitted by candidates will appear here."
        />
      } @else {
        <div class="row g-3">
          @for (req of editRequests; track req.id) {
            <div class="col-xxl-3 col-lg-4 col-md-6 col-12">
              <app-edit-request-card
                [request]="req"
                [isAdmin]="true"
                [isRecruiter]="false"
                (approved)="onEditApproved($event)"
                (rejected)="onEditRejected($event)"
                (cancelled)="onEditReviewCancelled()">
              </app-edit-request-card>
            </div>
          }
        </div>

        @if (editPagination.pages > 1) {
          <nav class="mt-4 d-flex justify-content-center">
            <ul class="pagination pagination-sm mb-0">
              <li class="page-item" [class.disabled]="editPagination.page === 1">
                <button class="page-link" (click)="goToEditPage(editPagination.page - 1)">«</button>
              </li>
              @for (pg of editPageNumbers(); track pg) {
                <li class="page-item" [class.active]="pg === editPagination.page">
                  <button class="page-link" (click)="goToEditPage(pg)">{{ pg }}</button>
                </li>
              }
              <li class="page-item" [class.disabled]="editPagination.page === editPagination.pages">
                <button class="page-link" (click)="goToEditPage(editPagination.page + 1)">»</button>
              </li>
            </ul>
          </nav>
        }
      }
    }

    <!-- ── CONTACT REQUESTS SECTION ── -->
    @if (activeSection === 'contact') {

      <!-- Status filter tabs -->
      <div class="nav-pills-custom mb-4">
        @for (tab of statusTabs; track tab.value) {
          <button class="nav-pill"
            [class.active]="contactStatus === tab.value"
            (click)="setContactStatus(tab.value)">
            {{ tab.label }}
          </button>
        }
      </div>

      @if (contactLoading) {
        <div class="loading-state">
          <div class="spinner-border"></div>
          <div class="loading-state__text">Loading requests…</div>
        </div>
      } @else if (contactRequests.length === 0) {
        <app-empty-state
          icon="bi-person-lines-fill"
          title="No contact requests found"
          subtitle="Contact info requests from recruiters will appear here."
        />
      } @else {
        <div class="d-flex flex-column gap-3">
          @for (req of contactRequests; track req.id) {
            <div class="request-card"
              [class.request-card--pending]="req.status === 'pending'"
              [class.request-card--approved]="req.status === 'approved'"
              [class.request-card--rejected]="req.status === 'rejected'">

              <div class="d-flex justify-content-between align-items-start mb-3">
                <div class="d-flex gap-3 align-items-start flex-wrap">
                  <!-- Recruiter -->
                  <div class="contact-req-party">
                    <div class="contact-req-party__label">Recruiter</div>
                    <div class="contact-req-party__name">{{ req.recruiter_name }}</div>
                    @if (req.recruiter_company) {
                      <div class="contact-req-party__sub">{{ req.recruiter_company }}</div>
                    }
                    <div class="contact-req-party__email">{{ req.recruiter_email }}</div>
                  </div>
                  <div class="contact-req-arrow"><i class="bi bi-arrow-right"></i></div>
                  <!-- Candidate -->
                  <div class="contact-req-party">
                    <div class="contact-req-party__label">Candidate</div>
                    <div class="contact-req-party__name">
                      {{ req.candidate_first_name }} {{ req.candidate_last_name }}
                      @if (req.candidate_number) {
                        <span class="autocode-badge ms-1">{{ req.candidate_number }}</span>
                      }
                    </div>
                    @if (req.candidate_job_title) {
                      <div class="contact-req-party__sub">{{ req.candidate_job_title }}</div>
                    }
                    <div class="contact-req-party__email">{{ req.candidate_email }}</div>
                  </div>
                </div>
                <div class="d-flex flex-column align-items-end gap-1">
                  <span class="badge rounded-pill px-3 py-2"
                    [class.badge-status-pending]="req.status === 'pending'"
                    [class.badge-status-active]="req.status === 'approved'"
                    [class.bg-danger]="req.status === 'rejected'">
                    {{ req.status | titlecase }}
                  </span>
                  <div class="text-muted" style="font-size:.73rem">
                    <i class="bi bi-clock me-1"></i>{{ req.created_at | date:'dd MMM yyyy, HH:mm' }}
                    @if (req.reviewed_at) { · Reviewed {{ req.reviewed_at | date:'dd MMM yyyy' }} }
                  </div>
                </div>
              </div>

              @if (req.admin_note) {
                <div class="alert alert-light py-2 small mb-3">
                  <i class="bi bi-chat-left-text me-1"></i>
                  <strong>Admin note:</strong> {{ req.admin_note }}
                </div>
              }

              @if (req.status === 'pending') {
                @if (contactReviewingId === req.id) {
                  <div class="request-card__review" [formGroup]="reviewForm">
                    <div class="mb-3">
                      <label class="form-label small fw-semibold">Admin Note (optional)</label>
                      <textarea formControlName="admin_note" class="form-control form-control-sm"
                        rows="2" placeholder="Reason for rejection, or approval comment…"></textarea>
                    </div>
                    <div class="d-flex gap-2">
                      <button class="btn btn-sm btn-success" (click)="confirmContactReview(req.id, 'approved')"
                        [disabled]="reviewSubmitting">
                        <i class="bi bi-check2 me-1"></i>{{ reviewSubmitting ? '…' : 'Approve' }}
                      </button>
                      <button class="btn btn-sm btn-danger" (click)="confirmContactReview(req.id, 'rejected')"
                        [disabled]="reviewSubmitting">
                        <i class="bi bi-x me-1"></i>{{ reviewSubmitting ? '…' : 'Reject' }}
                      </button>
                      <button class="btn btn-sm btn-outline-secondary" (click)="cancelReview()">Cancel</button>
                    </div>
                  </div>
                } @else {
                  <button class="btn btn-sm btn-outline-primary" (click)="startContactReview(req.id)">
                    <i class="bi bi-eye me-1"></i>Review
                  </button>
                }
              }

            </div>
          }
        </div>

        @if (contactPagination.pages > 1) {
          <nav class="mt-4 d-flex justify-content-center">
            <ul class="pagination pagination-sm mb-0">
              <li class="page-item" [class.disabled]="contactPagination.page === 1">
                <button class="page-link" (click)="goToContactPage(contactPagination.page - 1)">«</button>
              </li>
              @for (pg of contactPageNumbers(); track pg) {
                <li class="page-item" [class.active]="pg === contactPagination.page">
                  <button class="page-link" (click)="goToContactPage(pg)">{{ pg }}</button>
                </li>
              }
              <li class="page-item" [class.disabled]="contactPagination.page === contactPagination.pages">
                <button class="page-link" (click)="goToContactPage(contactPagination.page + 1)">»</button>
              </li>
            </ul>
          </nav>
        }
      }
    }
  `,
})
export class EditRequestsComponent implements OnInit {
  activeSection: 'edit' | 'contact' = 'edit';

  // Edit requests state
  editRequests: EditRequest[] = [];
  editPagination = { page: 1, limit: 10, total: 0, pages: 0 };
  editLoading = false;
  editStatus = 'pending';
  editReviewingId: string | null = null;
  editPendingCount = 0;

  // Contact requests state
  contactRequests: ContactRequest[] = [];
  contactPagination = { page: 1, limit: 10, total: 0, pages: 0 };
  contactLoading = false;
  contactStatus = 'pending';
  contactReviewingId: string | null = null;
  contactPendingCount = 0;

  // Shared review form
  reviewForm: FormGroup;
  reviewSubmitting = false;

  statusTabs = [
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
    private contactRequestService: ContactRequestService,
    private toast: ToastService,
  ) {
    this.reviewForm = this.fb.group({ admin_note: [''] });
  }

  ngOnInit(): void {
    this.loadEditRequests();
    this.loadContactRequests();
  }

  // ── Section toggle ─────────────────────────────────────────────────────────

  setSection(section: 'edit' | 'contact'): void {
    this.activeSection = section;
    this.cancelReview();
  }

  // ── Edit requests ──────────────────────────────────────────────────────────

  loadEditRequests(): void {
    this.editLoading = true;
    this.editRequestService.list({
      status: this.editStatus as any || undefined,
      page:   this.editPagination.page,
      limit:  this.editPagination.limit,
    }).subscribe({
      next: (res) => {
        this.editLoading    = false;
        this.editRequests   = res.data;
        this.editPagination = res.pagination;
      },
      error: () => (this.editLoading = false),
    });
    // Also load pending count for badge
    this.editRequestService.list({ status: 'pending', page: 1, limit: 1 }).subscribe({
      next: (res) => (this.editPendingCount = res.pagination.total),
    });
  }

  setEditStatus(status: string): void {
    this.editStatus          = status;
    this.editPagination.page = 1;
    this.loadEditRequests();
  }

  goToEditPage(page: number): void {
    if (page < 1 || page > this.editPagination.pages) return;
    this.editPagination.page = page;
    this.loadEditRequests();
  }

  editPageNumbers(): number[] {
    return this._pageNumbers(this.editPagination);
  }

  getEditChanges(req: EditRequest): { key: string; label: string; display: string }[] {
    const data = req.requested_data ?? {};
    return Object.entries(data)
      .filter(([k]) => k !== 'id' && k !== 'user_id')
      .map(([k, v]) => ({
        key:     k,
        label:   this.fieldLabels[k] ?? k,
        display: Array.isArray(v) ? JSON.stringify(v) : String(v ?? '—'),
      }));
  }

  startEditReview(id: string): void { this.editReviewingId = id; this.reviewForm.reset(); }

  confirmEditReview(id: string, status: 'approved' | 'rejected'): void {
    this.reviewSubmitting = true;
    const admin_note = this.reviewForm.value.admin_note || undefined;
    this.editRequestService.review(id, { status, admin_note }).subscribe({
      next: () => {
        this.reviewSubmitting = false;
        this.editReviewingId  = null;
        this.toast.success(`Request ${status}`);
        this.loadEditRequests();
      },
      error: (err) => {
        this.reviewSubmitting = false;
        this.toast.error(err?.error?.message ?? 'Failed to review');
      },
    });
  }

  // ── Contact requests ────────────────────────────────────────────────────────

  loadContactRequests(): void {
    this.contactLoading = true;
    this.contactRequestService.list({
      status: this.contactStatus || undefined,
      page:   this.contactPagination.page,
      limit:  this.contactPagination.limit,
    }).subscribe({
      next: (res) => {
        this.contactLoading    = false;
        this.contactRequests   = res.data;
        this.contactPagination = res.pagination;
      },
      error: () => (this.contactLoading = false),
    });
    // Pending count for badge
    this.contactRequestService.list({ status: 'pending', page: 1, limit: 1 }).subscribe({
      next: (res) => (this.contactPendingCount = res.pagination.total),
    });
  }

  setContactStatus(status: string): void {
    this.contactStatus          = status;
    this.contactPagination.page = 1;
    this.loadContactRequests();
  }

  goToContactPage(page: number): void {
    if (page < 1 || page > this.contactPagination.pages) return;
    this.contactPagination.page = page;
    this.loadContactRequests();
  }

  contactPageNumbers(): number[] {
    return this._pageNumbers(this.contactPagination);
  }

  startContactReview(id: string): void { this.contactReviewingId = id; this.reviewForm.reset(); }

  confirmContactReview(id: string, status: 'approved' | 'rejected'): void {
    this.reviewSubmitting    = true;
    const admin_note = this.reviewForm.value.admin_note || undefined;
    this.contactRequestService.review(id, { status, admin_note }).subscribe({
      next: () => {
        this.reviewSubmitting    = false;
        this.contactReviewingId  = null;
        this.toast.success(`Request ${status}`);
        this.loadContactRequests();
      },
      error: (err) => {
        this.reviewSubmitting = false;
        this.toast.error(err?.error?.message ?? 'Failed to review');
      },
    });
  }

  onEditApproved(event: { id: string; adminNote?: string }): void {
    this.reviewSubmitting = true;
    this.editRequestService.review(event.id, { status: 'approved', admin_note: event.adminNote }).subscribe({
      next: () => {
        this.reviewSubmitting = false;
        this.toast.success('Request approved');
        this.loadEditRequests();
      },
      error: (err) => {
        this.reviewSubmitting = false;
        this.toast.error(err?.error?.message ?? 'Failed to review');
      },
    });
  }

  onEditRejected(event: { id: string; adminNote?: string }): void {
    this.reviewSubmitting = true;
    this.editRequestService.review(event.id, { status: 'rejected', admin_note: event.adminNote }).subscribe({
      next: () => {
        this.reviewSubmitting = false;
        this.toast.success('Request rejected');
        this.loadEditRequests();
      },
      error: (err) => {
        this.reviewSubmitting = false;
        this.toast.error(err?.error?.message ?? 'Failed to review');
      },
    });
  }

  onEditReviewCancelled(): void {
    this.reviewSubmitting = false;
  }

  // ── Shared ────────────────────────────────────────────────────────────────

  cancelReview(): void {
    this.editReviewingId    = null;
    this.contactReviewingId = null;
  }

  private _pageNumbers(p: { page: number; pages: number }): number[] {
    const start = Math.max(1, p.page - 2);
    const end   = Math.min(p.pages, p.page + 2);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }
}
