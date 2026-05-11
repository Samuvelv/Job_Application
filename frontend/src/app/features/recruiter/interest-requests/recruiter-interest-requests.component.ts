// src/app/features/recruiter/interest-requests/recruiter-interest-requests.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { InterestRequestService, InterestRequest } from '../../../core/services/interest-request.service';
import { RecruiterService } from '../../../core/services/recruiter.service';
import { ToastService } from '../../../core/services/toast.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-recruiter-interest-requests',
  standalone: true,
  imports: [CommonModule, RouterLink, EmptyStateComponent, PageHeaderComponent],
  styles: [`
    .ir-card {
      background: var(--th-surface);
      border: 1px solid var(--th-border);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 14px;
      transition: border-color .15s;
    }
    .ir-card:hover { border-color: var(--th-border-strong); }

    .ir-card__header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }
    .ir-card__candidate {
      font-size: 15px;
      font-weight: 600;
      color: var(--th-text);
    }
    .ir-card__candidate a {
      color: inherit;
      text-decoration: none;
    }
    .ir-card__candidate a:hover { text-decoration: underline; color: var(--th-primary); }
    .ir-card__candidate-num {
      font-size: 12px;
      font-weight: 400;
      color: var(--th-muted);
      margin-left: 6px;
    }
    .ir-card__date {
      font-size: 12px;
      color: var(--th-muted);
      white-space: nowrap;
      flex-shrink: 0;
    }

    .ir-card__fields {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      margin-top: 10px;
    }
    .ir-card__field {
      font-size: 13px;
      color: var(--th-muted);
    }
    .ir-card__field strong { color: var(--th-text); }

    .ir-card__message {
      margin-top: 12px;
      padding: 12px;
      background: var(--th-surface-2);
      border-radius: 8px;
      font-size: 13px;
      color: var(--th-text);
      white-space: pre-wrap;
      line-height: 1.55;
    }

    .ir-card__admin-note {
      margin-top: 10px;
      padding: 10px 12px;
      background: var(--th-surface-2);
      border-left: 3px solid var(--th-primary);
      border-radius: 0 8px 8px 0;
      font-size: 13px;
      color: var(--th-muted);
    }
    .ir-card__admin-note strong { color: var(--th-text); }

    .ir-card__footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin-top: 14px;
      flex-wrap: wrap;
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
    }
    .status-badge--pending  { background: var(--th-amber-soft,  #fef3c7); color: var(--th-amber,  #d97706); }
    .status-badge--approved { background: var(--th-emerald-soft, #d1fae5); color: var(--th-emerald,#059669); }
    .status-badge--rejected { background: var(--th-red-soft,    #fee2e2); color: var(--th-red,    #dc2626); }

    .agency-only-notice {
      background: var(--th-surface);
      border: 1px solid var(--th-border);
      border-radius: 12px;
      padding: 40px 24px;
      text-align: center;
      color: var(--th-muted);
    }
    .agency-only-notice i { font-size: 2.5rem; display: block; margin-bottom: 12px; }
    .agency-only-notice h5 { color: var(--th-text); font-size: 16px; margin-bottom: 8px; }

    .summary-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 20px;
    }
    .summary-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 600;
      background: var(--th-surface);
      border: 1px solid var(--th-border);
      color: var(--th-text);
    }
    .summary-pill--pending  { border-color: var(--th-amber,  #d97706); color: var(--th-amber,  #d97706); }
    .summary-pill--approved { border-color: var(--th-emerald,#059669); color: var(--th-emerald,#059669); }
    .summary-pill--rejected { border-color: var(--th-red,    #dc2626); color: var(--th-red,    #dc2626); }
  `],
  template: `
    <app-page-header
      title="My Interest Requests"
      subtitle="Track the status of your agency interest requests submitted to candidates." />

    <!-- Loading -->
    @if (loading) {
      <div class="text-center py-5">
        <div class="spinner-border" style="color:var(--th-primary)"></div>
        <div class="mt-2 text-muted small">Loading your requests…</div>
      </div>

    <!-- Non-agency notice -->
    } @else if (!isAgency) {
      <div class="agency-only-notice">
        <i class="bi bi-briefcase text-muted"></i>
        <h5>Recruitment Agencies Only</h5>
        <p class="mb-0 small">
          Interest requests are only available to recruitment agency accounts.<br>
          Your account is registered as a direct employer.
        </p>
      </div>

    <!-- Main content -->
    } @else {

      <!-- Summary bar -->
      @if (requests.length > 0) {
        <div class="summary-bar">
          <span class="summary-pill">
            <i class="bi bi-list-ul"></i> {{ requests.length }} total
          </span>
          @if (countByStatus('pending') > 0) {
            <span class="summary-pill summary-pill--pending">
              <i class="bi bi-hourglass-split"></i> {{ countByStatus('pending') }} pending
            </span>
          }
          @if (countByStatus('approved') > 0) {
            <span class="summary-pill summary-pill--approved">
              <i class="bi bi-check-circle-fill"></i> {{ countByStatus('approved') }} approved
            </span>
          }
          @if (countByStatus('rejected') > 0) {
            <span class="summary-pill summary-pill--rejected">
              <i class="bi bi-x-circle-fill"></i> {{ countByStatus('rejected') }} rejected
            </span>
          }
        </div>
      }

      <!-- Empty state -->
      @if (requests.length === 0) {
        <app-empty-state
          icon="bi-briefcase"
          title="No interest requests yet"
          message="Browse candidates and submit an interest request from their profile page." />

      <!-- Request cards -->
      } @else {
        @for (r of requests; track r.id) {
          <div class="ir-card">

            <!-- Header row: candidate name + date -->
            <div class="ir-card__header">
              <div class="ir-card__candidate">
                <a [routerLink]="['/recruiter/candidates', r.candidate_id]">
                  {{ candidateName(r) }}
                </a>
                @if (r.candidate_number) {
                  <span class="ir-card__candidate-num">#{{ r.candidate_number }}</span>
                }
              </div>
              <span class="ir-card__date">
                <i class="bi bi-clock me-1"></i>{{ r.created_at | date:'dd MMM yyyy, HH:mm' }}
              </span>
            </div>

            <!-- Fields row -->
            <div class="ir-card__fields">
              <div class="ir-card__field">
                <strong>Sector:</strong> {{ r.sector }}
              </div>
              <div class="ir-card__field">
                <strong>Country:</strong> {{ r.country }}
              </div>
              @if (r.reviewed_at) {
                <div class="ir-card__field">
                  <strong>Reviewed:</strong> {{ r.reviewed_at | date:'dd MMM yyyy' }}
                </div>
              }
            </div>

            <!-- Message -->
            <div class="ir-card__message">{{ r.message }}</div>

            <!-- Admin note -->
            @if (r.admin_note) {
              <div class="ir-card__admin-note">
                <i class="bi bi-chat-left-text me-1"></i>
                <strong>Admin note:</strong> {{ r.admin_note }}
              </div>
            }

            <!-- Footer: status + action -->
            <div class="ir-card__footer">
              <span class="status-badge status-badge--{{ r.status }}">
                <i class="bi"
                  [class.bi-hourglass-split]="r.status === 'pending'"
                  [class.bi-check-circle-fill]="r.status === 'approved'"
                  [class.bi-x-circle-fill]="r.status === 'rejected'"></i>
                {{ r.status | titlecase }}
              </span>

              <div class="d-flex gap-2">
                <!-- Re-submit for rejected — navigate to candidate profile where the form lives -->
                @if (r.status === 'rejected') {
                  <a [routerLink]="['/recruiter/candidates', r.candidate_id]"
                     class="btn btn-sm btn-outline-primary">
                    <i class="bi bi-arrow-repeat me-1"></i>Re-submit
                  </a>
                }
                <a [routerLink]="['/recruiter/candidates', r.candidate_id]"
                   class="btn btn-sm btn-outline-secondary">
                  <i class="bi bi-eye me-1"></i>View Candidate
                </a>
              </div>
            </div>

          </div>
        }
      }

    }
  `,
})
export class RecruiterInterestRequestsComponent implements OnInit {
  loading = true;
  isAgency = false;
  requests: InterestRequest[] = [];

  constructor(
    private interestSvc: InterestRequestService,
    private recruiterSvc: RecruiterService,
    private toast: ToastService,
  ) {}

  ngOnInit(): void {
    forkJoin({
      profile:  this.recruiterSvc.getMyProfile().pipe(catchError(() => of(null))),
      requests: this.interestSvc.getMyRequests().pipe(catchError(() => of(null))),
    }).subscribe(({ profile, requests }) => {
      this.loading = false;

      if (profile) {
        this.isAgency = (profile.recruiter as any).type === 'recruitment_agency';
      }

      if (requests) {
        // Sort: pending first, then approved, then rejected; within each group newest first
        const order: Record<string, number> = { pending: 0, approved: 1, rejected: 2 };
        this.requests = [...requests.requests].sort((a, b) => {
          const statusDiff = (order[a.status] ?? 3) - (order[b.status] ?? 3);
          if (statusDiff !== 0) return statusDiff;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
      } else {
        this.toast.error('Failed to load interest requests.');
      }
    });
  }

  candidateName(r: InterestRequest): string {
    const first = r.candidate_first_name ?? '';
    const last  = r.candidate_last_name  ?? '';
    const name  = `${first} ${last}`.trim();
    return name || 'Unknown Candidate';
  }

  countByStatus(status: 'pending' | 'approved' | 'rejected'): number {
    return this.requests.filter(r => r.status === status).length;
  }
}
