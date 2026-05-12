// src/app/features/admin/candidate-profile/candidate-profile-page.component.ts
import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';

import { CandidateService } from '../../../core/services/candidate.service';
import { AgencyReferralService, ReferralPayload } from '../../../core/services/agency-referral.service';
import { MasterDataService } from '../../../core/services/master-data.service';
import { ToastService } from '../../../core/services/toast.service';

import { Candidate } from '../../../core/models/candidate.model';
import { AgencyReferral, ReferralStatus } from '../../../core/models/agency-referral.model';

import { CandidateProfileComponent } from '../../../shared/components/candidate-profile/candidate-profile.component';
import { SearchableSelectComponent, SelectOption } from '../../../shared/components/searchable-select/searchable-select.component';

const STATUS_CONFIG: Record<ReferralStatus, { label: string; badgeClass: string }> = {
  pending:      { label: 'Pending',      badgeClass: 'bg-warning text-dark' },
  progressing:  { label: 'Progressing',  badgeClass: 'bg-primary' },
  placed:       { label: 'Placed',       badgeClass: 'bg-success' },
  not_suitable: { label: 'Not Suitable', badgeClass: 'bg-danger' },
};

@Component({
  selector: 'app-candidate-profile-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, CandidateProfileComponent, SearchableSelectComponent],
  template: `
    <!-- Header row: back + actions -->
    <div class="d-flex align-items-center justify-content-between mb-3 gap-2">
      <a routerLink="/admin/candidates" class="back-btn">
        <i class="bi bi-arrow-left"></i>Back to Candidates
      </a>
      @if (candidate) {
        <div class="d-flex gap-2 align-items-center flex-wrap">

          <!-- ── Volunteer action area (only for placed candidates) ── -->
          @if (candidate.profile_status === 'placed') {

            @if (candidate.is_volunteer || candidate.volunteer_invite_status === 'converted') {
              <!-- Already a volunteer -->
              <span class="vol-status-chip vol-status-chip--converted">
                <i class="bi bi-person-check-fill me-1"></i>Volunteer
              </span>
              <a [routerLink]="['/admin/volunteers']" class="btn btn-outline-success btn-sm">
                <i class="bi bi-people-fill me-1"></i>View Volunteers
              </a>
            } @else if (candidate.volunteer_invite_status === 'invited') {
              <!-- Invitation already sent -->
              <span class="vol-status-chip vol-status-chip--invited">
                <i class="bi bi-envelope-check-fill me-1"></i>Invitation Sent
              </span>
              <button class="btn btn-outline-success btn-sm"
                [disabled]="inviting()"
                (click)="inviteAsVolunteer()"
                title="Resend invitation email">
                @if (inviting()) {
                  <span class="spinner-border spinner-border-sm me-1"></span>
                } @else {
                  <i class="bi bi-arrow-repeat me-1"></i>
                }
                Resend Invite
              </button>
              <button class="btn btn-success btn-sm" (click)="convertToVolunteer()">
                <i class="bi bi-person-plus-fill me-1"></i>Convert to Volunteer
              </button>
            } @else {
              <!-- Not yet invited -->
              <button class="btn btn-outline-success btn-sm"
                [disabled]="inviting()"
                (click)="inviteAsVolunteer()">
                @if (inviting()) {
                  <span class="spinner-border spinner-border-sm me-1"></span>Sending…
                } @else {
                  <i class="bi bi-envelope-plus me-1"></i>Invite as Volunteer
                }
              </button>
              <button class="btn btn-success btn-sm" (click)="convertToVolunteer()">
                <i class="bi bi-person-plus-fill me-1"></i>Convert to Volunteer
              </button>
            }
          }

          <a [routerLink]="['/admin/candidates', candidate.id, 'edit']"
            class="btn btn-primary btn-sm">
            <i class="bi bi-pencil me-1"></i>Edit Candidate
          </a>
        </div>
      }
    </div>

    @if (loadError()) {
      <div class="alert alert-danger">{{ loadError() }}</div>
    } @else if (!candidate) {
      <div class="loading-state">
        <div class="spinner-border"></div>
        <div class="loading-state__text">Loading profile…</div>
      </div>
    } @else {
      <app-candidate-profile [candidate]="candidate" />

      <!-- ── Agency Referrals Section ──────────────────────────────────────── -->
      <div class="card mt-4">
        <div class="card-header d-flex align-items-center justify-content-between">
          <h5 class="mb-0"><i class="bi bi-building me-2"></i>Agency Referrals</h5>
          <button class="btn btn-primary btn-sm" (click)="openAddModal(modalTpl)">
            <i class="bi bi-plus-lg me-1"></i>Add Referral
          </button>
        </div>
        <div class="card-body">
          @if (referralsLoading()) {
            <div class="text-center py-3">
              <div class="spinner-border spinner-border-sm"></div>
            </div>
          } @else if (referrals().length === 0) {
            <p class="text-muted mb-0">No agency referrals recorded yet.</p>
          } @else {
            <ul class="list-group list-group-flush">
              @for (ref of referrals(); track ref.id) {
                <li class="list-group-item px-0">
                  <div class="d-flex align-items-start justify-content-between gap-2">
                    <div>
                      <div class="fw-semibold">
                        Referred to {{ ref.agency_name }} for {{ ref.employer_name }}
                        — {{ ref.country }}
                        — Date: {{ ref.referral_date | date:'dd MMM yyyy' }}
                      </div>
                      @if (ref.notes) {
                        <div class="text-muted small mt-1">{{ ref.notes }}</div>
                      }
                    </div>
                    <div class="d-flex align-items-center gap-2 flex-shrink-0">
                      <span class="badge {{ statusConfig(ref.status).badgeClass }}">
                        {{ statusConfig(ref.status).label }}
                      </span>
                      <button class="btn btn-outline-secondary btn-sm"
                        (click)="openEditModal(modalTpl, ref)" title="Edit">
                        <i class="bi bi-pencil"></i>
                      </button>
                      <button class="btn btn-outline-danger btn-sm"
                        (click)="deleteReferral(ref.id)" title="Delete">
                        <i class="bi bi-trash"></i>
                      </button>
                    </div>
                  </div>
                </li>
              }
            </ul>
          }
          @if (referralError()) {
            <div class="alert alert-danger mt-2 mb-0">{{ referralError() }}</div>
          }
        </div>
      </div>
    }

    <!-- ── Modal Template ────────────────────────────────────────────────────── -->
    <ng-template #modalTpl let-modal>
      <div class="modal-header">
        <h5 class="modal-title">{{ editingId() ? 'Edit Referral' : 'Add Agency Referral' }}</h5>
        <button type="button" class="btn-close" (click)="modal.dismiss()"></button>
      </div>
      <div class="modal-body">
        @if (formError()) {
          <div class="alert alert-danger">{{ formError() }}</div>
        }
        <form [formGroup]="form" (ngSubmit)="submitForm(modal)">
          <!-- Agency Name -->
          <div class="mb-3">
            <label class="form-label">Agency Name <span class="text-danger">*</span></label>
            <input class="form-control" formControlName="agency_name"
              [class.is-invalid]="isInvalid('agency_name')" />
            @if (isInvalid('agency_name')) {
              <div class="invalid-feedback">Agency name is required.</div>
            }
          </div>

          <!-- Employer Name -->
          <div class="mb-3">
            <label class="form-label">Employer Name <span class="text-danger">*</span></label>
            <input class="form-control" formControlName="employer_name"
              [class.is-invalid]="isInvalid('employer_name')" />
            @if (isInvalid('employer_name')) {
              <div class="invalid-feedback">Employer name is required.</div>
            }
          </div>

          <!-- Country -->
          <div class="mb-3">
            <label class="form-label">Country <span class="text-danger">*</span></label>
            <app-searchable-select
              formControlName="country"
              [options]="countryOptions()"
              placeholder="Select country…"
              [invalid]="isInvalid('country')">
            </app-searchable-select>
            @if (isInvalid('country')) {
              <div class="text-danger small mt-1">Country is required.</div>
            }
          </div>

          <!-- Referral Date -->
          <div class="mb-3">
            <label class="form-label">Referral Date <span class="text-danger">*</span></label>
            <input type="date" class="form-control" formControlName="referral_date"
              [class.is-invalid]="isInvalid('referral_date')" />
            @if (isInvalid('referral_date')) {
              <div class="invalid-feedback">A valid date is required.</div>
            }
          </div>

          <!-- Status -->
          <div class="mb-3">
            <label class="form-label">Status <span class="text-danger">*</span></label>
            <select class="form-select" formControlName="status">
              <option value="pending">Pending</option>
              <option value="progressing">Progressing</option>
              <option value="placed">Placed</option>
              <option value="not_suitable">Not Suitable</option>
            </select>
          </div>

          <!-- Notes -->
          <div class="mb-3">
            <label class="form-label">Notes</label>
            <textarea class="form-control" formControlName="notes" rows="3"></textarea>
          </div>
        </form>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" (click)="modal.dismiss()">Cancel</button>
        <button type="button" class="btn btn-primary" (click)="submitForm(modal)" [disabled]="formSaving()">
          @if (formSaving()) {
            <span class="spinner-border spinner-border-sm me-1"></span>
          }
          {{ editingId() ? 'Save Changes' : 'Add Referral' }}
        </button>
      </div>
    </ng-template>

    <style>
      .vol-status-chip {
        display: inline-flex;
        align-items: center;
        font-size: .8rem;
        font-weight: 600;
        padding: .3rem .75rem;
        border-radius: 999px;
        white-space: nowrap;
      }
      .vol-status-chip--invited {
        background: #fef3c7;
        color: #92400e;
        border: 1px solid #fde68a;
      }
      .vol-status-chip--converted {
        background: #dcfce7;
        color: #15803d;
        border: 1px solid #bbf7d0;
      }
    </style>
  `,
})
export class CandidateProfilePageComponent implements OnInit {
  candidate: Candidate | null = null;

  // Signals
  loadError        = signal('');
  inviting         = signal(false);
  referrals        = signal<AgencyReferral[]>([]);
  referralsLoading = signal(false);
  referralError    = signal('');
  editingId        = signal<string | null>(null);
  formSaving       = signal(false);
  formError        = signal('');

  countryOptions = computed<SelectOption[]>(() =>
    this.masterData.countries().map((c) => ({ value: c.name, label: c.name }))
  );

  form!: FormGroup;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private candidateService: CandidateService,
    private referralService: AgencyReferralService,
    private masterData: MasterDataService,
    private modalService: NgbModal,
    private fb: FormBuilder,
    private toast: ToastService,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.loadError.set('Invalid candidate ID.'); return; }

    this.masterData.loadAll();

    this.candidateService.getById(id).subscribe({
      next: (res) => {
        this.candidate = res.candidate;
        this.loadReferrals(id);
      },
      error: (err) => this.loadError.set(err?.error?.message ?? 'Failed to load candidate.'),
    });
  }

  private loadReferrals(candidateId: string): void {
    this.referralsLoading.set(true);
    this.referralError.set('');
    this.referralService.list(candidateId).subscribe({
      next: (res) => {
        this.referrals.set(res.referrals);
        this.referralsLoading.set(false);
      },
      error: (err) => {
        this.referralError.set(err?.error?.message ?? 'Failed to load referrals.');
        this.referralsLoading.set(false);
      },
    });
  }

  inviteAsVolunteer(): void {
    if (!this.candidate || this.inviting()) return;
    this.inviting.set(true);
    this.candidateService.inviteVolunteer(this.candidate.id).subscribe({
      next: (res) => {
        this.inviting.set(false);
        this.toast.success(res.message ?? 'Invitation sent!');
        // Update local state so button switches to "Invitation Sent" immediately
        if (this.candidate) {
          this.candidate = { ...this.candidate, volunteer_invite_status: 'invited' };
        }
      },
      error: (err) => {
        this.inviting.set(false);
        this.toast.error(err?.error?.message ?? 'Failed to send invitation.');
      },
    });
  }

  convertToVolunteer(): void {
    if (!this.candidate) return;
    this.router.navigate(['/admin/volunteers/create'], {
      queryParams: { fromCandidate: this.candidate.id },
    });
  }

  statusConfig(status: string): { label: string; badgeClass: string } {
    return STATUS_CONFIG[status as ReferralStatus] ?? { label: status, badgeClass: 'bg-secondary' };
  }

  openAddModal(tpl: any): void {
    this.editingId.set(null);
    this.formError.set('');
    this.form = this.fb.group({
      agency_name:   ['', Validators.required],
      employer_name: ['', Validators.required],
      country:       ['', Validators.required],
      referral_date: ['', Validators.required],
      status:        ['pending', Validators.required],
      notes:         [''],
    });
    this.modalService.open(tpl, { centered: true, size: 'lg' });
  }

  openEditModal(tpl: any, ref: AgencyReferral): void {
    this.editingId.set(ref.id);
    this.formError.set('');
    this.form = this.fb.group({
      agency_name:   [ref.agency_name,   Validators.required],
      employer_name: [ref.employer_name, Validators.required],
      country:       [ref.country,       Validators.required],
      referral_date: [ref.referral_date, Validators.required],
      status:        [ref.status,        Validators.required],
      notes:         [ref.notes ?? ''],
    });
    this.modalService.open(tpl, { centered: true, size: 'lg' });
  }

  isInvalid(field: string): boolean {
    const ctrl = this.form?.get(field);
    return !!(ctrl && ctrl.invalid && (ctrl.dirty || ctrl.touched));
  }

  submitForm(modal: NgbModalRef): void {
    if (!this.candidate) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const payload: ReferralPayload = {
      agency_name:   this.form.value.agency_name,
      employer_name: this.form.value.employer_name,
      country:       this.form.value.country,
      referral_date: this.form.value.referral_date,
      status:        this.form.value.status,
      notes:         this.form.value.notes || null,
    };

    this.formSaving.set(true);
    this.formError.set('');

    const candidateId = this.candidate.id;
    const id = this.editingId();

    const req$ = id
      ? this.referralService.update(candidateId, id, payload)
      : this.referralService.create(candidateId, payload);

    req$.subscribe({
      next: (res) => {
        if (id) {
          this.referrals.update((list) => list.map((r) => r.id === id ? res.referral : r));
        } else {
          this.referrals.update((list) => [res.referral, ...list]);
        }
        this.formSaving.set(false);
        modal.close();
      },
      error: (err) => {
        this.formError.set(err?.error?.message ?? 'Failed to save referral.');
        this.formSaving.set(false);
      },
    });
  }

  deleteReferral(referralId: string): void {
    if (!this.candidate) return;
    if (!confirm('Delete this referral? This cannot be undone.')) return;

    this.referralService.delete(this.candidate.id, referralId).subscribe({
      next: () => this.referrals.update((list) => list.filter((r) => r.id !== referralId)),
      error: (err) => this.referralError.set(err?.error?.message ?? 'Failed to delete referral.'),
    });
  }
}
