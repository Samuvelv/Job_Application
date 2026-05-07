// src/app/features/candidate/volunteers/volunteer-public-profile.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule }      from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule }       from '@angular/forms';
import { forkJoin, of }      from 'rxjs';
import { catchError }        from 'rxjs/operators';

import { VolunteerService }               from '../../../core/services/volunteer.service';
import { VolunteerSupportRequestService } from '../../../core/services/volunteer-support-request.service';
import { Volunteer }                      from '../../../core/models/volunteer.model';
import { VolunteerSupportRequest }        from '../../../core/models/volunteer-support-request.model';

@Component({
  selector: 'app-volunteer-public-profile',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <!-- Back link -->
    <div class="mb-4">
      <a routerLink="/candidate/volunteers" class="back-link">
        <i class="bi bi-arrow-left me-1"></i>Back to Volunteers
      </a>
    </div>

    <!-- Loading -->
    @if (loading) {
      <div class="loading-state">
        <div class="spinner-border text-primary"></div>
        <div class="loading-state__text">Loading profile…</div>
      </div>
    }

    <!-- Error -->
    @if (error && !loading) {
      <div class="alert alert-danger">{{ error }}</div>
    }

    @if (volunteer && !loading) {
      <!-- Hero card -->
      <div class="vpp-hero card mb-4">
        <div class="card-body d-flex align-items-center gap-4 flex-wrap">
          <!-- Avatar / photo -->
          @if (volunteer.photo_url) {
            <img [src]="volunteer.photo_url" [alt]="volunteer.name"
                 class="vpp-avatar vpp-avatar--photo" />
          } @else {
            <div class="vpp-avatar vpp-avatar--initials">
              {{ initials(volunteer.name) }}
            </div>
          }

          <!-- Name + availability -->
          <div class="flex-grow-1">
            <h2 class="vpp-name mb-1">{{ volunteer.name }}</h2>
            @if (volunteer.role) {
              <p class="text-muted mb-2">{{ volunteer.role }}</p>
            }
            <span class="badge"
              [class.bg-success]="volunteer.availability === 'Active'"
              [class.bg-warning]="volunteer.availability !== 'Active'"
              [class.text-dark]="volunteer.availability !== 'Active'">
              <i class="bi bi-circle-fill me-1" style="font-size:8px;"></i>
              {{ volunteer.availability ?? 'Active' }}
            </span>
          </div>

          <!-- Request Support CTA (desktop) -->
          <div class="d-none d-md-block">
            <ng-container *ngTemplateOutlet="requestBtn"></ng-container>
          </div>
        </div>
      </div>

      <div class="row g-4">
        <!-- Left column -->
        <div class="col-lg-7">

          <!-- Journey card -->
          @if (volunteer.nationality || volunteer.country_placed) {
            <div class="card mb-4">
              <div class="card-header fw-semibold">
                <i class="bi bi-geo-alt-fill me-2 text-primary"></i>Journey
              </div>
              <div class="card-body">
                <div class="vpp-journey">
                  @if (volunteer.nationality) {
                    <div class="vpp-journey__step">
                      <div class="vpp-journey__label">From</div>
                      <div class="vpp-journey__value">{{ volunteer.nationality }}</div>
                    </div>
                    <div class="vpp-journey__arrow"><i class="bi bi-arrow-right"></i></div>
                  }
                  @if (volunteer.country_placed) {
                    <div class="vpp-journey__step">
                      <div class="vpp-journey__label">Placed in</div>
                      <div class="vpp-journey__value">{{ volunteer.country_placed }}</div>
                    </div>
                  }
                </div>
                @if (volunteer.company_joined || volunteer.year_placed) {
                  <div class="mt-3 d-flex gap-4 flex-wrap text-muted small">
                    @if (volunteer.company_joined) {
                      <span><i class="bi bi-building me-1"></i>{{ volunteer.company_joined }}</span>
                    }
                    @if (volunteer.year_placed) {
                      <span><i class="bi bi-calendar3 me-1"></i>Placed in {{ volunteer.year_placed }}</span>
                    }
                  </div>
                }
              </div>
            </div>
          }

          <!-- Success story -->
          @if (volunteer.success_story) {
            <div class="card mb-4">
              <div class="card-header fw-semibold">
                <i class="bi bi-chat-quote-fill me-2 text-primary"></i>Success Story
              </div>
              <div class="card-body">
                <p class="vpp-story">{{ volunteer.success_story }}</p>
              </div>
            </div>
          }

          <!-- Languages -->
          @if (volunteer.languages?.length) {
            <div class="card mb-4">
              <div class="card-header fw-semibold">
                <i class="bi bi-translate me-2 text-primary"></i>Languages Spoken
              </div>
              <div class="card-body d-flex flex-wrap gap-2">
                @for (lang of volunteer.languages; track lang) {
                  <span class="badge rounded-pill bg-primary-subtle text-primary-emphasis px-3 py-2">
                    {{ lang }}
                  </span>
                }
              </div>
            </div>
          }
        </div>

        <!-- Right column -->
        <div class="col-lg-5">

          <!-- Request Support card -->
          <div class="card mb-4 vpp-support-card">
            <div class="card-header fw-semibold">
              <i class="bi bi-hand-thumbsup-fill me-2 text-primary"></i>Request Support
            </div>
            <div class="card-body">
              @if (alreadyRequested) {
                <!-- Already submitted -->
                <div class="text-center py-3">
                  <i class="bi bi-check-circle-fill text-success" style="font-size:2.5rem;"></i>
                  <p class="mt-3 mb-1 fw-semibold">Support Requested!</p>
                  <p class="text-muted small">
                    Our team has been notified and will connect you with
                    <strong>{{ volunteer.name }}</strong> shortly.
                  </p>
                  @if (myRequest?.status === 'connected') {
                    <span class="badge bg-success mt-2">Connected</span>
                  } @else if (myRequest?.status === 'closed') {
                    <span class="badge bg-secondary mt-2">Closed</span>
                  } @else {
                    <span class="badge bg-warning text-dark mt-2">Pending Review</span>
                  }
                </div>
              } @else {
                <!-- Request form -->
                <p class="text-muted small mb-3">
                  Send a request to our admin team — they will connect you with
                  <strong>{{ volunteer.name }}</strong>. Your contact details will never
                  be shared without your consent.
                </p>
                <div class="mb-3">
                  <label class="form-label fw-medium">Message <span class="text-muted">(optional)</span></label>
                  <textarea class="form-control" rows="4"
                    placeholder="Tell us a bit about what kind of support you're looking for…"
                    [(ngModel)]="message" maxlength="500"></textarea>
                  <div class="form-text text-end">{{ message.length }}/500</div>
                </div>
                @if (submitError) {
                  <div class="alert alert-danger py-2 small">
                    <i class="bi bi-exclamation-triangle me-1"></i>{{ submitError }}
                  </div>
                }
                <button class="btn btn-primary w-100" (click)="submitRequest()"
                  [disabled]="submitting">
                  @if (submitting) {
                    <span class="spinner-border spinner-border-sm me-2"></span>Sending…
                  } @else {
                    <i class="bi bi-send-fill me-2"></i>Send Support Request
                  }
                </button>
              }
            </div>
          </div>

          <!-- Stats card -->
          @if (volunteer.candidates_helped) {
            <div class="card mb-4">
              <div class="card-body text-center">
                <div class="vpp-stat-number">{{ volunteer.candidates_helped }}</div>
                <div class="text-muted small">Candidates Helped</div>
              </div>
            </div>
          }

        </div>
      </div>

      <!-- Mobile: Request support button -->
      <div class="d-md-none mb-4">
        <ng-container *ngTemplateOutlet="requestBtn"></ng-container>
      </div>
    }

    <!-- Shared request button template (used on hero and mobile) -->
    <ng-template #requestBtn>
      @if (volunteer) {
        @if (alreadyRequested) {
          <button class="btn btn-success" disabled>
            <i class="bi bi-check-circle-fill me-2"></i>Support Requested
          </button>
        } @else {
          <button class="btn btn-primary" (click)="scrollToForm()">
            <i class="bi bi-hand-thumbsup-fill me-2"></i>Request Support
          </button>
        }
      }
    </ng-template>
  `,
  styles: [`
    .back-link {
      color: var(--bs-primary);
      text-decoration: none;
      font-size: 0.875rem;
      font-weight: 500;
    }
    .back-link:hover { text-decoration: underline; }

    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      padding: 60px 0;
    }
    .loading-state__text { color: #6b7280; }

    /* Hero card */
    .vpp-hero { border-radius: 12px; }
    .vpp-name { font-size: 1.6rem; font-weight: 700; color: #111827; }

    /* Avatar */
    .vpp-avatar {
      width: 96px; height: 96px;
      border-radius: 50%;
      object-fit: cover;
      flex-shrink: 0;
    }
    .vpp-avatar--photo { border: 3px solid var(--bs-primary); }
    .vpp-avatar--initials {
      display: flex; align-items: center; justify-content: center;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: #fff;
      font-size: 2rem;
      font-weight: 700;
      letter-spacing: 2px;
    }

    /* Journey */
    .vpp-journey {
      display: flex;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
    }
    .vpp-journey__label {
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #9ca3af;
      font-weight: 600;
    }
    .vpp-journey__value {
      font-size: 1.1rem;
      font-weight: 600;
      color: #111827;
    }
    .vpp-journey__arrow { font-size: 1.5rem; color: var(--bs-primary); }

    /* Success story */
    .vpp-story {
      font-size: 1rem;
      line-height: 1.8;
      color: #374151;
      white-space: pre-line;
    }

    /* Support card */
    .vpp-support-card { position: sticky; top: 80px; }

    /* Stat */
    .vpp-stat-number {
      font-size: 2.5rem;
      font-weight: 800;
      color: var(--bs-primary);
    }
  `],
})
export class VolunteerPublicProfileComponent implements OnInit {
  volunteer:    Volunteer | null = null;
  myRequests:   VolunteerSupportRequest[] = [];
  loading = true;
  error   = '';

  // request form
  message     = '';
  submitting  = false;
  submitError = '';

  constructor(
    private route:          ActivatedRoute,
    private volunteerSvc:   VolunteerService,
    private supportSvc:     VolunteerSupportRequestService,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.error = 'Invalid volunteer ID.'; this.loading = false; return; }

    forkJoin({
      vol:  this.volunteerSvc.getById(id),
      mine: this.supportSvc.getMine().pipe(catchError(() => of({ supportRequests: [] }))),
    }).subscribe({
      next: ({ vol, mine }) => {
        this.volunteer  = vol.volunteer;
        this.myRequests = mine.supportRequests;
        this.loading    = false;
      },
      error: (err) => {
        this.error   = err?.error?.message ?? 'Failed to load volunteer profile.';
        this.loading = false;
      },
    });
  }

  /** True if an active (pending or connected) request exists for this volunteer */
  get alreadyRequested(): boolean {
    return this.myRequests.some(
      r => r.volunteer_id === this.volunteer?.id && r.status !== 'closed',
    );
  }

  /** The existing request (for status badge) */
  get myRequest(): VolunteerSupportRequest | undefined {
    return this.myRequests.find(
      r => r.volunteer_id === this.volunteer?.id && r.status !== 'closed',
    );
  }

  initials(name: string): string {
    return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  }

  scrollToForm(): void {
    document.querySelector('.vpp-support-card')?.scrollIntoView({ behavior: 'smooth' });
  }

  submitRequest(): void {
    if (!this.volunteer) return;
    this.submitting  = true;
    this.submitError = '';

    this.supportSvc.create(this.volunteer.id, this.message || undefined).subscribe({
      next: (res) => {
        this.myRequests = [...this.myRequests, res.supportRequest];
        this.submitting = false;
        this.message    = '';
      },
      error: (err) => {
        this.submitting  = false;
        this.submitError = err?.error?.message ?? 'Failed to submit request. Please try again.';
      },
    });
  }
}
