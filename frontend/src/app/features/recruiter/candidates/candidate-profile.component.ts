// src/app/features/recruiter/candidates/candidate-profile.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { catchError, forkJoin, of } from 'rxjs';
import { CandidateService } from '../../../core/services/candidate.service';
import { RecruiterService } from '../../../core/services/recruiter.service';
import { ContactRequestService } from '../../../core/services/contact-request.service';
import { InterestRequestService, InterestRequest } from '../../../core/services/interest-request.service';
import { Candidate } from '../../../core/models/candidate.model';
import { ContactRequest } from '../../../core/models/contact-request.model';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { CandidateProfileComponent } from '../../../shared/components/candidate-profile/candidate-profile.component';

@Component({
  selector: 'app-recruiter-candidate-profile',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, PageHeaderComponent, CandidateProfileComponent],
  styles: [`
    .interest-panel {
      background: var(--th-surface);
      border: 1px solid var(--th-border);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 20px;
    }
    .interest-panel__title { font-weight: 600; font-size: 15px; margin-bottom: 4px; }
    .interest-panel__sub   { font-size: 13px; color: var(--th-muted); margin-bottom: 16px; }
    .interest-panel__label { font-size: 12px; font-weight: 600; color: var(--th-muted); text-transform: uppercase; margin-bottom: 6px; }
    .interest-panel__input,
    .interest-panel__textarea {
      width: 100%;
      border-radius: 8px;
      border: 1px solid var(--th-border-strong);
      padding: 8px 12px;
      font-size: 14px;
      background: var(--th-surface-2);
      color: var(--th-text);
    }
    .interest-panel__textarea { resize: vertical; }
    .interest-status-badge {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 5px 12px; border-radius: 20px; font-size: 13px; font-weight: 600;
    }
    .interest-status-badge--pending  { background: #fef3c7; color: #d97706; }
    .interest-status-badge--approved { background: #d1fae5; color: #059669; }
    .interest-status-badge--rejected { background: #fee2e2; color: #dc2626; }
  `],
  template: `
    <!-- Back button + action bar -->
    <div class="d-flex align-items-center gap-3 mb-3 flex-wrap">
      <a routerLink="/recruiter/candidates" class="btn btn-sm btn-outline-secondary">
        <i class="bi bi-arrow-left me-1"></i>Back to Candidates
      </a>

      @if (candidate) {
        <div class="ms-auto d-flex align-items-center gap-2 flex-wrap">

          <!-- Direct employer: contact request button -->
          @if (!isAgency) {
            @if (contactRequestStatus === 'approved') {
              <span class="contact-status-badge contact-status-badge--approved">
                <i class="bi bi-unlock-fill"></i>Contact Unlocked
              </span>
            } @else if (contactRequestStatus === 'pending') {
              <span class="contact-status-badge contact-status-badge--pending">
                <i class="bi bi-hourglass-split"></i>Request Pending
              </span>
            } @else if (contactRequestStatus === 'rejected') {
              <div class="d-flex align-items-center gap-2">
                <span class="contact-status-badge contact-status-badge--rejected">
                  <i class="bi bi-x-circle-fill"></i>Request Rejected
                </span>
                <button class="btn btn-sm btn-outline-primary" (click)="requestContactInfo()" [disabled]="requesting">
                  @if (requesting) {
                    <span class="spinner-border spinner-border-sm me-1"></span>
                  } @else {
                    <i class="bi bi-arrow-repeat me-1"></i>
                  }
                  Re-request
                </button>
              </div>
            } @else if (contactRequestStatus === 'revoked') {
              <div class="d-flex align-items-center gap-2">
                <span class="contact-status-badge contact-status-badge--revoked">
                  <i class="bi bi-shield-x-fill"></i>Access Revoked
                </span>
                <button class="btn btn-sm btn-outline-primary" (click)="requestContactInfo()" [disabled]="requesting">
                  @if (requesting) {
                    <span class="spinner-border spinner-border-sm me-1"></span>
                  } @else {
                    <i class="bi bi-arrow-repeat me-1"></i>
                  }
                  Request Again
                </button>
              </div>
            } @else {
              <button class="btn btn-sm btn-primary" (click)="requestContactInfo()" [disabled]="requesting">
                @if (requesting) {
                  <span class="spinner-border spinner-border-sm me-1"></span>Requesting…
                } @else {
                  <i class="bi bi-person-lines-fill me-1"></i>Request Contact Info
                }
              </button>
            }
          }

          <!-- Shortlist -->
          @if (shortlisted) {
            <span class="badge rounded-pill px-3 py-2"
              style="background:var(--th-emerald-soft);color:var(--th-emerald);font-size:.8rem;">
              <i class="bi bi-bookmark-star-fill me-1"></i>Shortlisted
            </span>
          } @else {
            <button class="btn btn-outline-primary btn-sm" (click)="addToShortlist()" [disabled]="shortlisting">
              @if (shortlisting) {
                <span class="spinner-border spinner-border-sm me-1"></span>Adding…
              } @else {
                <i class="bi bi-bookmark-plus me-1"></i>Add to Shortlist
              }
            </button>
          }
        </div>
      }
    </div>

    <!-- Contact request rejection note (direct employers only) -->
    @if (!isAgency && contactRequestStatus === 'rejected' && contactRequest?.admin_note) {
      <div class="alert alert-warning small py-2 mb-3">
        <i class="bi bi-chat-left-text me-1"></i>
        <strong>Admin note:</strong> {{ contactRequest!.admin_note }}
      </div>
    }

    <!-- Contact access revoked note (direct employers only) -->
    @if (!isAgency && contactRequestStatus === 'revoked') {
      <div class="alert alert-secondary small py-2 mb-3">
        <i class="bi bi-shield-x me-1"></i>
        <strong>Access revoked by admin.</strong>
        @if (contactRequest?.revocation_reason) {
          Reason: {{ contactRequest!.revocation_reason }}
        }
        You may submit a new request to regain access.
      </div>
    }

    <!-- Agency: interest request panel -->
    @if (isAgency && candidate) {
      <div class="interest-panel">
        <div class="interest-panel__title"><i class="bi bi-briefcase-fill me-2" style="color:var(--th-primary)"></i>Submit an Interest Request</div>
        <div class="interest-panel__sub">
          As a recruitment agency, you cannot contact candidates directly. Submit an interest request and our admin team will facilitate the introduction after verifying your sponsor licence.
        </div>

        @if (interestRequest) {
          <!-- Existing request status -->
          <div class="d-flex align-items-center gap-3 flex-wrap">
            <span class="interest-status-badge interest-status-badge--{{ interestRequest.status }}">
              <i class="bi"
                [class.bi-hourglass-split]="interestRequest.status === 'pending'"
                [class.bi-check-circle-fill]="interestRequest.status === 'approved'"
                [class.bi-x-circle-fill]="interestRequest.status === 'rejected'"></i>
              {{ interestRequest.status === 'pending' ? 'Request Pending — awaiting admin review' :
                 interestRequest.status === 'approved' ? 'Request Approved — we will be in touch' :
                 'Request Not Approved' }}
            </span>
          </div>
          @if (interestRequest.admin_note) {
            <div class="mt-2 small" style="color:var(--th-muted);">
              <i class="bi bi-chat-left-text me-1"></i><strong>Admin note:</strong> {{ interestRequest.admin_note }}
            </div>
          }
          @if (interestRequest.status === 'rejected') {
            <button class="btn btn-sm btn-outline-primary mt-3" (click)="resetInterestForm()">
              <i class="bi bi-arrow-repeat me-1"></i>Submit New Request
            </button>
          }
        } @else {
          <!-- Interest request form -->
          <div class="row g-3">
            <div class="col-md-6">
              <div class="interest-panel__label">Sector *</div>
              <input class="interest-panel__input" type="text" [(ngModel)]="interestForm.sector"
                placeholder="e.g. Healthcare, Engineering" maxlength="150" />
            </div>
            <div class="col-md-6">
              <div class="interest-panel__label">Target Country *</div>
              <input class="interest-panel__input" type="text" [(ngModel)]="interestForm.country"
                placeholder="e.g. United Kingdom" maxlength="100" />
            </div>
            <div class="col-12">
              <div class="interest-panel__label">Message to Admin *</div>
              <textarea class="interest-panel__textarea" rows="4" [(ngModel)]="interestForm.message"
                placeholder="Describe the role, why this candidate is a good fit, and any relevant details…"
                maxlength="2000"></textarea>
              <div class="text-end small" style="color:var(--th-muted);">{{ interestForm.message.length }}/2000</div>
            </div>
            <div class="col-12">
              <button class="btn btn-primary btn-sm" (click)="submitInterestRequest()" [disabled]="submittingInterest">
                @if (submittingInterest) {
                  <span class="spinner-border spinner-border-sm me-1"></span>Submitting…
                } @else {
                  <i class="bi bi-send me-1"></i>Submit Interest Request
                }
              </button>
            </div>
          </div>
        }
      </div>
    }

    <!-- Loading -->
    @if (loading) {
      <div class="loading-state">
        <div class="spinner-border"></div>
        <div class="loading-state__text">Loading profile…</div>
      </div>
    } @else if (error) {
      <div class="alert alert-danger">{{ error }}</div>
    } @else if (candidate) {
      <app-candidate-profile
        [candidate]="candidate"
        [contactLocked]="contactLocked"
        [showAdminInfo]="false" />
    }
  `,
})
export class RecruiterCandidateProfileComponent implements OnInit {
  candidate: Candidate | null = null;
  loading = true;
  error = '';
  shortlisted = false;
  shortlisting = false;
  requesting = false;

  contactLocked = true;
  contactRequest: ContactRequest | null = null;
  contactRequestStatus: 'none' | 'pending' | 'approved' | 'rejected' | 'revoked' = 'none';

  isAgency = false;
  interestRequest: InterestRequest | null = null;
  interestForm = { sector: '', country: '', message: '' };
  submittingInterest = false;

  private candidateId = '';

  constructor(
    private route: ActivatedRoute,
    private candidateService: CandidateService,
    private recruiterService: RecruiterService,
    private contactRequestService: ContactRequestService,
    private interestRequestService: InterestRequestService,
    private toast: ToastService,
  ) {}

  ngOnInit(): void {
    this.candidateId = this.route.snapshot.paramMap.get('id')!;

    forkJoin({
      profile:        this.candidateService.getById(this.candidateId).pipe(catchError(() => of(null))),
      shortlist:      this.recruiterService.getShortlist().pipe(catchError(() => of(null))),
      myRequests:     this.contactRequestService.getMyRequests().pipe(catchError(() => of(null))),
      myProfile:      this.recruiterService.getMyProfile().pipe(catchError(() => of(null))),
      myInterests:    this.interestRequestService.getMyRequests().pipe(catchError(() => of(null))),
    }).subscribe(({ profile, shortlist, myRequests, myProfile, myInterests }) => {
      this.loading = false;

      if (profile) {
        this.candidate    = profile.candidate;
        this.contactLocked = !!(profile.candidate as any).contact_locked;
      } else {
        this.error = 'Failed to load candidate profile.';
      }

      if (shortlist) {
        this.shortlisted = shortlist.shortlist.some((e: any) => e.candidate_id === this.candidateId);
      }

      if (myProfile) {
        this.isAgency = (myProfile.recruiter as any).type === 'recruitment_agency';
      }

      if (!this.isAgency && myRequests) {
        const req = myRequests.requests.find((r: ContactRequest) => r.candidate_id === this.candidateId);
        if (req) {
          this.contactRequest       = req;
          this.contactRequestStatus = req.status;
        }
      }

      if (this.isAgency && myInterests) {
        const ir = myInterests.requests.find((r: InterestRequest) => r.candidate_id === this.candidateId);
        if (ir) this.interestRequest = ir;
      }
    });
  }

  requestContactInfo(): void {
    this.requesting = true;
    this.contactRequestService.create(this.candidateId).subscribe({
      next: (res) => {
        this.requesting           = false;
        this.contactRequest       = res.request;
        this.contactRequestStatus = 'pending';
        this.toast.success('Contact info request submitted. Awaiting admin approval.');
      },
      error: (err) => {
        this.requesting = false;
        this.toast.error(err?.error?.message ?? 'Failed to submit request');
      },
    });
  }

  submitInterestRequest(): void {
    const { sector, country, message } = this.interestForm;
    if (!sector.trim() || !country.trim() || message.trim().length < 10) {
      this.toast.error('Please fill in all fields (message must be at least 10 characters).');
      return;
    }
    this.submittingInterest = true;
    this.interestRequestService.create({ candidate_id: this.candidateId, sector, country, message }).subscribe({
      next: (res) => {
        this.submittingInterest = false;
        this.interestRequest    = res.request;
        this.toast.success('Interest request submitted. Awaiting admin review.');
      },
      error: (err) => {
        this.submittingInterest = false;
        this.toast.error(err?.error?.message ?? 'Failed to submit interest request');
      },
    });
  }

  resetInterestForm(): void {
    this.interestRequest = null;
    this.interestForm    = { sector: '', country: '', message: '' };
  }

  addToShortlist(): void {
    if (!this.candidate) return;
    this.shortlisting = true;
    this.recruiterService.addToShortlist(this.candidate.id).subscribe({
      next: () => {
        this.shortlisting = false;
        this.shortlisted = true;
        this.toast.success(`${this.candidate!.first_name} ${this.candidate!.last_name} added to shortlist`);
      },
      error: (err) => {
        this.shortlisting = false;
        this.toast.error(err?.error?.message ?? 'Failed to shortlist');
      },
    });
  }
}
