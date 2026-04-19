// src/app/features/recruiter/candidates/candidate-profile.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { CandidateService } from '../../../core/services/candidate.service';
import { RecruiterService } from '../../../core/services/recruiter.service';
import { ContactRequestService } from '../../../core/services/contact-request.service';
import { Candidate } from '../../../core/models/candidate.model';
import { ContactRequest } from '../../../core/models/contact-request.model';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { CandidateProfileComponent } from '../../../shared/components/candidate-profile/candidate-profile.component';

@Component({
  selector: 'app-recruiter-candidate-profile',
  standalone: true,
  imports: [CommonModule, RouterLink, PageHeaderComponent, CandidateProfileComponent],
  template: `
    <!-- Back button + action bar -->
    <div class="d-flex align-items-center gap-3 mb-3 flex-wrap">
      <a routerLink="/recruiter/candidates" class="btn btn-sm btn-outline-secondary">
        <i class="bi bi-arrow-left me-1"></i>Back to Candidates
      </a>

      @if (candidate) {
        <div class="ms-auto d-flex align-items-center gap-2 flex-wrap">

          <!-- Contact Info request button/status -->
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
              <button class="btn btn-sm btn-outline-primary" (click)="requestContactInfo()"
                [disabled]="requesting">
                @if (requesting) {
                  <span class="spinner-border spinner-border-sm me-1"></span>
                } @else {
                  <i class="bi bi-arrow-repeat me-1"></i>
                }
                Re-request
              </button>
            </div>
          } @else {
            <button class="btn btn-sm btn-primary" (click)="requestContactInfo()"
              [disabled]="requesting">
              @if (requesting) {
                <span class="spinner-border spinner-border-sm me-1"></span>Requesting…
              } @else {
                <i class="bi bi-person-lines-fill me-1"></i>Request Contact Info
              }
            </button>
          }

          <!-- Shortlist -->
          @if (shortlisted) {
            <span class="badge rounded-pill px-3 py-2"
              style="background:var(--th-emerald-soft);color:var(--th-emerald);font-size:.8rem;">
              <i class="bi bi-bookmark-star-fill me-1"></i>Shortlisted
            </span>
          } @else {
            <button class="btn btn-outline-primary btn-sm" (click)="addToShortlist()"
              [disabled]="shortlisting">
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

    <!-- Contact request rejection note -->
    @if (contactRequestStatus === 'rejected' && contactRequest?.admin_note) {
      <div class="alert alert-warning small py-2 mb-3">
        <i class="bi bi-chat-left-text me-1"></i>
        <strong>Admin note:</strong> {{ contactRequest!.admin_note }}
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
        [contactLocked]="contactLocked" />
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
  contactRequestStatus: 'none' | 'pending' | 'approved' | 'rejected' = 'none';

  private candidateId = '';

  constructor(
    private route: ActivatedRoute,
    private candidateService: CandidateService,
    private recruiterService: RecruiterService,
    private contactRequestService: ContactRequestService,
    private toast: ToastService,
  ) {}

  ngOnInit(): void {
    this.candidateId = this.route.snapshot.paramMap.get('id')!;

    forkJoin({
      profile:   this.candidateService.getById(this.candidateId).pipe(catchError(() => of(null))),
      shortlist: this.recruiterService.getShortlist().pipe(catchError(() => of(null))),
      myRequests: this.contactRequestService.getMyRequests().pipe(catchError(() => of(null))),
    }).subscribe(({ profile, shortlist, myRequests }) => {
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

      if (myRequests) {
        const req = myRequests.requests.find((r: ContactRequest) => r.candidate_id === this.candidateId);
        if (req) {
          this.contactRequest       = req;
          this.contactRequestStatus = req.status;
        }
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
