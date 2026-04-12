// src/app/features/admin/recruiter-profile/recruiter-profile-page.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { RecruiterService } from '../../../core/services/recruiter.service';
import { Recruiter, ShortlistEntry } from '../../../core/models/recruiter.model';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';

@Component({
  selector: 'app-recruiter-profile-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <!-- Back + Edit row -->
    <div class="d-flex align-items-center justify-content-between mb-4 gap-2 flex-wrap">
      <a routerLink="/admin/recruiters" class="back-btn">
        <i class="bi bi-arrow-left"></i> Back to Recruiters
      </a>
      @if (recruiter) {
        <div class="tbl-actions">
          <button class="tbl-actions__btn tbl-actions__btn--edit tbl-actions__btn--icon"
            (click)="openEdit()" title="Edit recruiter">
            <i class="bi bi-pencil"></i>
          </button>
          <div class="tbl-actions__sep"></div>
          <button class="tbl-actions__btn tbl-actions__btn--token"
            (click)="resendCredentials()" [disabled]="resendLoading" title="Resend login credentials">
            @if (resendLoading) {
              <span class="spinner-border spinner-border-sm"></span>
            } @else {
              <i class="bi bi-envelope"></i>
            }
            Resend Credentials
          </button>
          <div class="tbl-actions__sep"></div>
          <button class="tbl-actions__btn tbl-actions__btn--danger tbl-actions__btn--icon"
            (click)="deleteRecruiter()" title="Delete recruiter">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      }
    </div>

    @if (loadError) {
      <div class="alert alert-danger">{{ loadError }}</div>
    } @else if (!recruiter) {
      <div class="loading-state">
        <div class="spinner-border"></div>
        <div class="loading-state__text">Loading recruiter…</div>
      </div>
    } @else {

      <!-- ── Hero card ──────────────────────────────────────────────────── -->
      <div class="section-card mb-4">
        <div class="recruiter-hero">
          <div class="recruiter-hero__avatar">
            {{ recruiter.contact_name[0].toUpperCase() }}
          </div>
          <div class="recruiter-hero__info">
            <h2 class="recruiter-hero__name">{{ recruiter.contact_name }}</h2>
            @if (recruiter.company_name) {
              <div class="recruiter-hero__company">
                <i class="bi bi-building me-1"></i>{{ recruiter.company_name }}
              </div>
            }
            <div class="recruiter-hero__meta">
              <span class="recruiter-hero__meta-chip">
                <i class="bi bi-envelope-fill"></i>{{ recruiter.email }}
              </span>
              <span class="recruiter-hero__meta-chip">
                <i class="bi bi-calendar-fill"></i>
                Joined {{ recruiter.created_at | date:'dd MMM yyyy' }}
              </span>
            </div>
          </div>
          <!-- Account status badge -->
          <div class="recruiter-hero__badge-wrap">
            <span class="badge rounded-pill px-3 py-2 fs-6"
              [class.bg-success]="recruiter.is_active"
              [class.bg-secondary]="!recruiter.is_active">
              <i class="bi me-1"
                [class.bi-shield-check]="recruiter.is_active"
                [class.bi-shield-x]="!recruiter.is_active"></i>
              {{ recruiter.is_active ? 'Active' : 'Inactive' }}
            </span>
          </div>
        </div>
      </div>

      <!-- ── Details + Access grid ─────────────────────────────────────── -->
      <div class="row g-4 mb-4">

        <!-- Account details -->
        <div class="col-md-6">
          <div class="section-card h-100">
            <h5 class="card-section-header mb-3">
              <i class="bi bi-person-badge"></i> Account Details
            </h5>
            <dl class="info-dl">
              <dt>Contact Name</dt>
              <dd>{{ recruiter.contact_name }}</dd>
              <dt>Company</dt>
              <dd>{{ recruiter.company_name || '—' }}</dd>
              <dt>Email</dt>
              <dd>{{ recruiter.email }}</dd>
              <dt>Account Status</dt>
              <dd>
                <span class="badge rounded-pill"
                  [class.bg-success]="recruiter.is_active"
                  [class.bg-secondary]="!recruiter.is_active">
                  {{ recruiter.is_active ? 'Active' : 'Inactive' }}
                </span>
              </dd>
              <dt>Registered</dt>
              <dd>{{ recruiter.created_at | date:'dd MMM yyyy, HH:mm' }}</dd>
            </dl>
          </div>
        </div>

        <!-- Access / login details -->
        <div class="col-md-6">
          <div class="section-card h-100">
            <h5 class="card-section-header card-section-header--info mb-3">
              <i class="bi bi-shield-lock"></i> Login &amp; Access
            </h5>
            <dl class="info-dl">
              <dt>Login Method</dt>
              <dd>Email &amp; password (same as <code>/login</code>)</dd>
              <dt>Account Status</dt>
              <dd>
                <span class="badge rounded-pill"
                  [class.bg-success]="recruiter.is_active"
                  [class.bg-secondary]="!recruiter.is_active">
                  {{ recruiter.is_active ? 'Active' : 'Inactive' }}
                </span>
              </dd>
              <dt>Credentials</dt>
              <dd>
                <button class="btn btn-sm btn-outline-secondary" [disabled]="resendLoading"
                  (click)="resendCredentials()">
                  @if (resendLoading) {
                    <span class="spinner-border spinner-border-sm me-1"></span>
                  } @else {
                    <i class="bi bi-envelope me-1"></i>
                  }
                  Resend credentials email
                </button>
              </dd>
            </dl>
          </div>
        </div>

      </div>

      <!-- ── Shortlisted Candidates ─────────────────────────────────────── -->
      <div class="section-card">
        <h5 class="card-section-header card-section-header--success mb-3">
          <i class="bi bi-bookmark-heart"></i> Shortlisted Candidates
          <span class="badge bg-secondary rounded-pill ms-2 fw-normal" style="font-size:.7rem">
            {{ shortlist.length }}
          </span>
        </h5>

        @if (shortlistLoading) {
          <div class="loading-state py-4">
            <div class="spinner-border spinner-border-sm"></div>
            <div class="loading-state__text">Loading shortlist…</div>
          </div>
        } @else if (shortlist.length === 0) {
          <div class="text-center py-5 text-muted">
            <i class="bi bi-bookmark display-5 d-block mb-2 opacity-25"></i>
            <div class="small">No candidates shortlisted yet.</div>
          </div>
        } @else {
          <div class="table-responsive">
            <table class="table table-hover align-middle mb-0">
              <thead class="table-light">
                <tr>
                  <th class="small">Candidate</th>
                  <th class="small">Role</th>
                  <th class="small">Industry</th>
                  <th class="small">Location</th>
                  <th class="small">Exp.</th>
                  <th class="small">Shortlisted</th>
                  <th class="small">Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (entry of shortlist; track entry.shortlist_id) {
                  <tr>
                    <td>
                      <div class="d-flex align-items-center gap-2">
                        @if (entry.profile_photo_url) {
                          <img [src]="entry.profile_photo_url" alt=""
                            class="avatar-circle-sm flex-shrink-0"
                            style="object-fit:cover"
                            (error)="$any($event.target).style.display='none'">
                        } @else {
                          <div class="avatar-circle-sm flex-shrink-0">
                            {{ entry.first_name[0] }}{{ entry.last_name[0] }}
                          </div>
                        }
                        <div>
                          <div class="fw-semibold small">{{ entry.first_name }} {{ entry.last_name }}</div>
                          <div class="text-muted" style="font-size:.72rem">{{ entry.email }}</div>
                        </div>
                      </div>
                    </td>
                    <td class="small">{{ entry.job_title || entry.occupation || '—' }}</td>
                    <td class="small">{{ entry.industry || '—' }}</td>
                    <td class="small">
                      {{ entry.current_city ? entry.current_city + ', ' : '' }}{{ entry.current_country || '—' }}
                    </td>
                    <td class="small">
                      {{ entry.years_experience != null ? entry.years_experience + ' yrs' : '—' }}
                    </td>
                    <td class="small text-muted">{{ entry.shortlisted_at | date:'dd MMM yyyy' }}</td>
                    <td>
                      <div class="tbl-actions">
                        <a [routerLink]="['/admin/employees', entry.employee_id]"
                          class="tbl-actions__btn tbl-actions__btn--view tbl-actions__btn--icon"
                          title="View profile">
                          <i class="bi bi-eye"></i>
                        </a>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>

      <!-- ── Inline Edit Panel ──────────────────────────────────────────── -->
      @if (editOpen) {
        <div class="file-preview-overlay" (click)="closeEdit()">
          <div class="edit-panel" (click)="$event.stopPropagation()">
            <div class="edit-panel__header">
              <div>
                <div class="fw-bold">Edit Recruiter</div>
                <div class="text-muted small">{{ recruiter.email }}</div>
              </div>
              <button type="button" class="file-preview-dialog__close" (click)="closeEdit()">
                <i class="bi bi-x-lg"></i>
              </button>
            </div>
            <div class="edit-panel__body">
              <div class="mb-3">
                <label class="form-label fw-semibold">Contact Name <span class="text-danger">*</span></label>
                <input class="form-control" [(ngModel)]="editName"
                  [class.is-invalid]="editSubmitted && !editName.trim()">
                <div class="invalid-feedback">Contact name is required.</div>
              </div>
              <div class="mb-4">
                <label class="form-label fw-semibold">Company Name</label>
                <input class="form-control" [(ngModel)]="editCompany" placeholder="Optional">
              </div>
              @if (editError) {
                <div class="alert alert-danger small py-2">{{ editError }}</div>
              }
              <div class="d-flex gap-2">
                <button type="button" class="btn btn-outline-secondary flex-grow-1" (click)="closeEdit()">
                  Cancel
                </button>
                <button type="button" class="btn btn-primary flex-grow-1"
                  [disabled]="editSaving" (click)="saveEdit()">
                  @if (editSaving) {
                    <span class="spinner-border spinner-border-sm me-1"></span> Saving…
                  } @else {
                    <i class="bi bi-check-lg me-1"></i> Save
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      }

    }
  `,
})
export class RecruiterProfilePageComponent implements OnInit {
  recruiterId = '';
  recruiter: Recruiter | null = null;
  shortlist: ShortlistEntry[] = [];
  loadError = '';
  shortlistLoading = false;
  resendLoading = false;

  // Edit panel state
  editOpen = false;
  editName = '';
  editCompany = '';
  editSaving = false;
  editError = '';
  editSubmitted = false;

  constructor(
    private route: ActivatedRoute,
    private recruiterSvc: RecruiterService,
    private toast: ToastService,
    private confirm: ConfirmDialogService,
  ) {}

  ngOnInit(): void {
    this.recruiterId = this.route.snapshot.paramMap.get('id') ?? '';
    if (!this.recruiterId) { this.loadError = 'Invalid recruiter ID.'; return; }
    this.load();
  }

  private load(): void {
    this.recruiterSvc.getById(this.recruiterId).subscribe({
      next: (res) => {
        this.recruiter = res.recruiter;
        this.loadShortlist();
      },
      error: (err) => (this.loadError = err?.error?.message ?? 'Failed to load recruiter.'),
    });
  }

  private loadShortlist(): void {
    this.shortlistLoading = true;
    this.recruiterSvc.getShortlistById(this.recruiterId).subscribe({
      next: (res) => { this.shortlist = res.shortlist; this.shortlistLoading = false; },
      error: () => { this.shortlistLoading = false; },
    });
  }

  // ── Edit ────────────────────────────────────────────────────────────────────
  openEdit(): void {
    if (!this.recruiter) return;
    this.editName      = this.recruiter.contact_name;
    this.editCompany   = this.recruiter.company_name ?? '';
    this.editError     = '';
    this.editSubmitted = false;
    this.editOpen      = true;
  }

  closeEdit(): void {
    this.editOpen    = false;
    this.editSaving  = false;
    this.editError   = '';
    this.editSubmitted = false;
  }

  saveEdit(): void {
    this.editSubmitted = true;
    if (!this.editName.trim()) return;
    this.editSaving = true;
    this.editError  = '';
    this.recruiterSvc.update(this.recruiterId, {
      contact_name: this.editName.trim(),
      company_name: this.editCompany.trim() || undefined,
    }).subscribe({
      next: (res) => {
        this.recruiter = res.recruiter;
        this.editSaving = false;
        this.toast.success('Recruiter updated');
        this.closeEdit();
      },
      error: (err) => {
        this.editSaving = false;
        this.editError  = err?.error?.message ?? 'Update failed.';
      },
    });
  }

  // ── Resend credentials ────────────────────────────────────────────────────────
  resendCredentials(): void {
    if (!this.recruiter) return;
    this.resendLoading = true;
    this.recruiterSvc.resendCredentials(this.recruiterId).subscribe({
      next: () => {
        this.resendLoading = false;
        this.toast.success('Credentials resent to ' + this.recruiter!.email);
      },
      error: (err) => {
        this.resendLoading = false;
        this.toast.error(err?.error?.message ?? 'Failed to resend credentials');
      },
    });
  }

  // ── Delete ────────────────────────────────────────────────────────────────────
  async deleteRecruiter(): Promise<void> {
    if (!this.recruiter) return;
    const ok = await this.confirm.confirm({
      title: 'Delete Recruiter',
      message: `Delete ${this.recruiter.contact_name}? This action is irreversible.`,
      confirmLabel: 'Delete',
      confirmClass: 'btn-danger',
    });
    if (!ok) return;
    this.recruiterSvc.delete(this.recruiterId).subscribe({
      next: () => {
        this.toast.success('Recruiter deleted');
        window.history.back();
      },
      error: (err) => this.toast.error(err?.error?.message ?? 'Delete failed'),
    });
  }
}
