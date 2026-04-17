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
    <!-- Back + actions row -->
    <div class="d-flex align-items-center justify-content-between mb-4 gap-2 flex-wrap">
      <a routerLink="/admin/recruiters" class="back-btn">
        <i class="bi bi-arrow-left"></i> Back to Recruiters
      </a>
      @if (recruiter) {
        <div class="tbl-actions">
          <button class="tbl-actions__btn tbl-actions__btn--edit"
            (click)="openEdit()" title="Edit recruiter">
            <i class="bi bi-pencil me-1"></i> Edit
          </button>
          <div class="tbl-actions__sep"></div>
          <button class="tbl-actions__btn tbl-actions__btn--token"
            (click)="resendCredentials()" [disabled]="resendLoading">
            @if (resendLoading) {
              <span class="spinner-border spinner-border-sm me-1"></span>
            } @else {
              <i class="bi bi-envelope me-1"></i>
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

      <!-- ── Hero ──────────────────────────────────────────────────────── -->
      <div class="rp-hero mb-4">
        <!-- Cover banner -->
        <div class="rp-hero__cover"></div>

        <div class="rp-hero__body">
          <!-- Avatar -->
          <div class="rp-hero__avatar-wrap">
            <div class="rp-hero__avatar">
              {{ recruiter.contact_name[0].toUpperCase() }}
            </div>
          </div>

          <!-- Name / company / status row -->
          <div class="rp-hero__info">
            <div class="rp-hero__name-row">
              <h2 class="rp-hero__name">{{ recruiter.contact_name }}</h2>
              <span class="rp-hero__status-badge"
                [class.rp-hero__status-badge--active]="recruiter.is_active"
                [class.rp-hero__status-badge--inactive]="!recruiter.is_active">
                <i class="bi"
                  [class.bi-shield-fill-check]="recruiter.is_active"
                  [class.bi-shield-fill-x]="!recruiter.is_active"></i>
                {{ recruiter.is_active ? 'Active' : 'Inactive' }}
              </span>
            </div>

            @if (recruiter.company_name) {
              <div class="rp-hero__company">
                <i class="bi bi-building-fill me-1"></i>{{ recruiter.company_name }}
              </div>
            }

            <div class="rp-hero__chips">
              <span class="rp-hero__chip">
                <i class="bi bi-envelope-fill"></i>{{ recruiter.email }}
              </span>
              <span class="rp-hero__chip">
                <i class="bi bi-calendar3"></i>Joined {{ recruiter.created_at | date:'dd MMM yyyy' }}
              </span>
            </div>
          </div>

          <!-- Stat pills -->
          <div class="rp-hero__stats">
            <div class="rp-hero__stat">
              <span class="rp-hero__stat-num">{{ shortlist.length }}</span>
              <span class="rp-hero__stat-label">Shortlisted</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Info cards row ─────────────────────────────────────────────── -->
      <div class="row g-3 mb-4">

        <!-- Contact details -->
        <div class="col-md-6">
          <div class="rp-info-card h-100">
            <div class="rp-info-card__header">
              <i class="bi bi-person-badge-fill rp-info-card__icon rp-info-card__icon--primary"></i>
              <span>Contact Details</span>
            </div>
            <div class="rp-info-card__rows">
              <div class="rp-info-card__row">
                <i class="bi bi-person"></i>
                <div>
                  <div class="rp-info-card__label">Full Name</div>
                  <div class="rp-info-card__value">{{ recruiter.contact_name }}</div>
                </div>
              </div>
              <div class="rp-info-card__row">
                <i class="bi bi-building"></i>
                <div>
                  <div class="rp-info-card__label">Company</div>
                  <div class="rp-info-card__value">{{ recruiter.company_name || '—' }}</div>
                </div>
              </div>
              <div class="rp-info-card__row">
                <i class="bi bi-envelope"></i>
                <div>
                  <div class="rp-info-card__label">Email</div>
                  <div class="rp-info-card__value text-break">{{ recruiter.email }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Account info -->
        <div class="col-md-6">
          <div class="rp-info-card h-100">
            <div class="rp-info-card__header">
              <i class="bi bi-shield-lock-fill rp-info-card__icon rp-info-card__icon--info"></i>
              <span>Account Info</span>
            </div>
            <div class="rp-info-card__rows">
              <div class="rp-info-card__row">
                <i class="bi bi-toggle-on"></i>
                <div>
                  <div class="rp-info-card__label">Status</div>
                  <div class="rp-info-card__value">
                    <span class="badge rounded-pill"
                      [class.badge-status-active]="recruiter.is_active"
                      [class.badge-status-inactive]="!recruiter.is_active">
                      {{ recruiter.is_active ? 'Active' : 'Inactive' }}
                    </span>
                  </div>
                </div>
              </div>
              <div class="rp-info-card__row">
                <i class="bi bi-calendar-check"></i>
                <div>
                  <div class="rp-info-card__label">Registered</div>
                  <div class="rp-info-card__value">{{ recruiter.created_at | date:'dd MMM yyyy, HH:mm' }}</div>
                </div>
              </div>
              <div class="rp-info-card__row">
                <i class="bi bi-key"></i>
                <div>
                  <div class="rp-info-card__label">Login</div>
                  <div class="rp-info-card__value">Email &amp; password</div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- ── Shortlisted Candidates ─────────────────────────────────────── -->
      <div class="rp-shortlist-section">

        <!-- Section header — matches rp-info-card header style -->
        <div class="rp-shortlist-section__header">
          <div class="rp-shortlist-section__title">
            <i class="bi bi-bookmark-heart-fill rp-shortlist-section__icon"></i>
            <span>Shortlisted Candidates</span>
          </div>
          <span class="rp-shortlist-section__count">{{ shortlist.length }}</span>
        </div>

        <!-- Body -->
        <div class="rp-shortlist-section__body">
          @if (shortlistLoading) {
            <div class="loading-state py-4">
              <div class="spinner-border spinner-border-sm"></div>
              <div class="loading-state__text">Loading shortlist…</div>
            </div>
          } @else if (shortlist.length === 0) {
            <div class="rp-shortlist-section__empty">
              <i class="bi bi-bookmark"></i>
              <div>No candidates shortlisted yet.</div>
            </div>
          } @else {
            <div class="sl-list">
              @for (entry of shortlist; track entry.shortlist_id) {
                <div class="sl-row">

                  <!-- Avatar -->
                  <div class="sl-row__avatar-wrap">
                    @if (entry.profile_photo_url) {
                      <img [src]="entry.profile_photo_url" alt=""
                        class="sl-row__avatar"
                        (error)="$any($event.target).src=''">
                    } @else {
                      <div class="sl-row__avatar-placeholder">
                        {{ entry.first_name[0] }}{{ entry.last_name[0] }}
                      </div>
                    }
                  </div>

                  <!-- Identity + chips -->
                  <div class="sl-row__main">
                    <div class="sl-row__name">{{ entry.first_name }} {{ entry.last_name }}</div>
                    <div class="sl-row__email">{{ entry.email }}</div>
                    <div class="sl-row__chips">
                      @if (entry.job_title || entry.occupation) {
                        <span class="sl-chip sl-chip--role">
                          <i class="bi bi-briefcase-fill"></i>{{ entry.job_title || entry.occupation }}
                        </span>
                      }
                      @if (entry.industry) {
                        <span class="sl-chip sl-chip--industry">
                          <i class="bi bi-building"></i>{{ entry.industry }}
                        </span>
                      }
                      @if (entry.current_country) {
                        <span class="sl-chip sl-chip--location">
                          <i class="bi bi-geo-alt-fill"></i>{{ entry.current_city ? entry.current_city + ', ' : '' }}{{ entry.current_country }}
                        </span>
                      }
                      @if (entry.years_experience != null) {
                        <span class="sl-chip sl-chip--exp">
                          <i class="bi bi-clock-history"></i>{{ entry.years_experience }} yrs exp
                        </span>
                      }
                    </div>
                  </div>

                  <!-- Date + action -->
                  <div class="sl-row__end">
                    <span class="sl-row__date">
                      <i class="bi bi-bookmark-fill"></i>{{ entry.shortlisted_at | date:'dd MMM yyyy' }}
                    </span>
                    <a [routerLink]="['/admin/candidates', entry.candidate_id]"
                      class="sl-row__view-btn">
                      <i class="bi bi-eye me-1"></i>View
                    </a>
                  </div>

                </div>
              }
            </div>
          }
        </div>
      </div>

      <!-- ── Edit Panel ─────────────────────────────────────────────────── -->
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
