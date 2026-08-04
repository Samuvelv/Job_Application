// src/app/shared/components/recruiter-candidate-card/recruiter-candidate-card.component.ts
import { Component, Input, Output, EventEmitter, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Candidate } from '../../../core/models/candidate.model';
import { InterestRequest } from '../../../core/services/interest-request.service';
import { MasterDataService } from '../../../core/services/master-data.service';

@Component({
  selector: 'app-recruiter-candidate-card',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule],
  styles: [':host { display: block; height: 100%; }'],
  template: `
    <div class="cl-card">

      <!-- ── Shortlisted badge (top-right corner) ── -->
      @if (isShortlisted) {
        <span style="
          position:absolute;top:.55rem;right:.55rem;
          display:inline-flex;align-items:center;gap:.25rem;
          font-size:.62rem;font-weight:700;letter-spacing:.4px;text-transform:uppercase;
          padding:.2rem .45rem;border-radius:999px;
          background:rgba(16,185,129,.15);color:var(--th-emerald);
          border:1px solid rgba(16,185,129,.35);
          pointer-events:none;z-index:1;">
          <i class="bi bi-bookmark-star-fill"></i> {{ 'CANDIDATE_CARD.shortlisted' | translate }}
        </span>
      }

      <!-- ── Hero: avatar + name + title ── -->
      <div class="cl-card__hero">
        <div class="cl-card__avatar-wrap">
          @if (candidate.profile_photo_url) {
            <img [src]="candidate.profile_photo_url" alt=""
              class="cl-card__avatar"
              (error)="$any($event.target).style.display='none'">
          } @else {
            <div class="cl-card__avatar-placeholder">
              {{ candidate.first_name[0] }}{{ candidate.last_name[0] }}
            </div>
          }
        </div>
        <div class="cl-card__name">{{ candidate.first_name }} {{ candidate.last_name }}</div>
        <div class="cl-card__job">
          {{ translated?.['job_title'] || translated?.['occupation'] || candidate.job_title || candidate.occupation || '—' }}
        </div>
      </div>

      <!-- ── Info rows ── -->
      <div style="display:flex;flex-direction:column;gap:0;border:1px solid var(--th-border);border-radius:.625rem;overflow:hidden;">

        @if (candidate.industry) {
          <div style="display:flex;align-items:center;gap:0;padding:.42rem .7rem;border-bottom:1px solid var(--th-border);">
            <span style="display:inline-flex;align-items:center;gap:.3rem;font-size:.66rem;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--th-text-muted);min-width:6.2rem;flex-shrink:0;">
              <i class="bi bi-building" style="font-size:.72rem;color:var(--th-primary);opacity:.8;"></i>{{ 'CANDIDATE_CARD.industry' | translate }}
              <span style="margin-left:auto;">:</span>
            </span>
            <span style="font-size:.8rem;font-weight:500;color:var(--th-text);padding-left:.5rem;">{{ translated?.['industry'] || candidate.industry }}</span>
          </div>
        }

        @if (candidate.years_experience != null) {
          <div style="display:flex;align-items:center;gap:0;padding:.42rem .7rem;border-bottom:1px solid var(--th-border);">
            <span style="display:inline-flex;align-items:center;gap:.3rem;font-size:.66rem;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--th-text-muted);min-width:6.2rem;flex-shrink:0;">
              <i class="bi bi-clock-history" style="font-size:.72rem;color:var(--th-primary);opacity:.8;"></i>{{ 'CANDIDATE_CARD.exp' | translate }}
              <span style="margin-left:auto;">:</span>
            </span>
            <span style="font-size:.8rem;font-weight:500;color:var(--th-text);padding-left:.5rem;">{{ candidate.years_experience }} {{ candidate.years_experience === 1 ? ('CANDIDATE_CARD.year' | translate) : ('CANDIDATE_CARD.years' | translate) }}</span>
          </div>
        }

        @if (candidate.current_country) {
          <div style="display:flex;align-items:center;gap:0;padding:.42rem .7rem;border-bottom:1px solid var(--th-border);">
            <span style="display:inline-flex;align-items:center;gap:.3rem;font-size:.66rem;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--th-text-muted);min-width:6.2rem;flex-shrink:0;">
              <i class="bi bi-geo-alt-fill" style="font-size:.72rem;color:var(--th-primary);opacity:.8;"></i>{{ 'CANDIDATE_CARD.location' | translate }}
              <span style="margin-left:auto;">:</span>
            </span>
            <span style="font-size:.8rem;font-weight:500;color:var(--th-text);padding-left:.5rem;">{{ (translated?.['city'] || candidate.current_city) ? (translated?.['city'] || candidate.current_city) + ', ' : '' }}{{ translated?.['country'] || candidate.current_country }}</span>
          </div>
        }

        @if (firstTarget) {
          <div style="display:flex;align-items:center;gap:0;padding:.42rem .7rem;">
            <span style="display:inline-flex;align-items:center;gap:.3rem;font-size:.66rem;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--th-text-muted);min-width:6.2rem;flex-shrink:0;">
              <i class="bi bi-send-fill" style="font-size:.72rem;color:var(--th-primary);opacity:.8;"></i>{{ 'CANDIDATE_CARD.target' | translate }}
              <span style="margin-left:auto;">:</span>
            </span>
            <span style="font-size:.8rem;font-weight:500;color:var(--th-text);padding-left:.5rem;">{{ translated?.['target'] || firstTarget }}</span>
          </div>
        }

      </div>

      <!-- ── Skills ── -->
      @if (candidate.skills?.length) {
        <div class="cl-card__location" style="flex-wrap:wrap;gap:.3rem;">
          @for (s of candidate.skills!.slice(0, 4); track s.skill_name; let $index = $index) {
            <span class="cl-card__loc-chip" style="font-size:.68rem;">{{ translated?.['skill_' + $index] || s.skill_name }}</span>
          }
          @if (candidate.skills!.length > 4) {
            <span class="cl-card__loc-chip" style="font-size:.68rem;opacity:.7;">
              +{{ candidate.skills!.length - 4 }} {{ 'CANDIDATE_CARD.more' | translate }}
            </span>
          }
        </div>
      }

      <!-- ── Contact details (approved requests only) ── -->
      @if (candidate.phone || candidate.whatsapp_number || candidate.email) {
        <div class="cl-card__flags" style="flex-direction:column;align-items:flex-start;gap:.3rem;padding:.5rem .625rem;background:var(--th-success-soft);border-radius:var(--th-radius);border:1px solid rgba(16,185,129,.2);">
          <div style="font-size:.65rem;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--th-emerald);margin-bottom:.1rem;">
            <i class="bi bi-shield-check-fill"></i> {{ 'CANDIDATE_CARD.approved_contact' | translate }}
          </div>
          @if (candidate.phone) {
            <span class="cl-card__flag cl-card__flag--has-video" style="background:none;padding:0;">
              <i class="bi bi-telephone-fill"></i> {{ candidate.phone }}
            </span>
          }
          @if (candidate.whatsapp_number) {
            <span class="cl-card__flag cl-card__flag--has-video" style="background:none;padding:0;">
              <i class="bi bi-whatsapp"></i> {{ candidate.whatsapp_number }}
            </span>
          }
          @if (candidate.email) {
            <span class="cl-card__flag cl-card__flag--has-video" style="background:none;padding:0;">
              <i class="bi bi-envelope-fill"></i> {{ candidate.email }}
            </span>
          }
        </div>
      }

      <!-- ── Actions footer ── -->
      <div class="cl-card__actions">
        <a [routerLink]="['/recruiter/candidates', candidate.id]"
          class="cl-card__action cl-card__action--view">
          <i class="bi bi-eye"></i><span>{{ 'CANDIDATE_CARD.view' | translate }}</span>
        </a>

        <button class="cl-card__action"
          [class.cl-card__action--forward]="!isShortlisted"
          [style.color]="isShortlisted ? '#f59e0b' : null"
          [style.border-color]="isShortlisted ? 'rgba(245,158,11,.5)' : null"
          [style.background]="isShortlisted ? 'rgba(245,158,11,.12)' : null"
          (click)="shortlist.emit()"
          [title]="isShortlisted ? ('CANDIDATE_CARD.shortlisted' | translate) : ('CANDIDATE_CARD.add_to_shortlist' | translate)">
          <i class="bi"
            [class.bi-bookmark-plus]="!isShortlisted"
            [class.bi-bookmark-star-fill]="isShortlisted"></i>
        </button>

        @if (requestStatus === 'pending') {
          <span class="cl-card__action" style="cursor:default;opacity:.8;color:var(--th-amber);border-color:rgba(245,158,11,.3);background:var(--th-amber-soft);">
            <i class="bi bi-hourglass-split"></i><span>{{ 'CANDIDATE_CARD.pending' | translate }}</span>
          </span>
        } @else if (requestStatus === 'approved') {
          <span class="cl-card__action" style="cursor:default;opacity:.9;color:var(--th-emerald);border-color:rgba(16,185,129,.3);background:var(--th-emerald-soft);">
            <i class="bi bi-check-circle-fill"></i><span>{{ 'CANDIDATE_CARD.approved' | translate }}</span>
          </span>
        } @else {
          <button class="cl-card__action cl-card__action--forward"
            (click)="requestInterest.emit()"
            [title]="'CANDIDATE_CARD.request_interest_title' | translate">
            <i class="bi bi-send-fill"></i><span>{{ 'CANDIDATE_CARD.request' | translate }}</span>
          </button>
        }
      </div>

    </div>
  `,
})
export class RecruiterCandidateCardComponent {
  @Input({ required: true }) candidate!: Candidate;
  @Input() interestRequest: InterestRequest | null = null;
  @Input() isShortlisted = false;
  /** AI-translated preview fields for this card (job_title, occupation, industry, city, country, target, skill_0..3), or null before/without translation. */
  @Input() translated: Record<string, string> | null = null;
  @Output() shortlist       = new EventEmitter<void>();
  @Output() requestInterest = new EventEmitter<void>();

  constructor(private master: MasterDataService, private translate: TranslateService) {}

  private readonly flagMap = computed<Map<string, string>>(() => {
    const map = new Map<string, string>();
    this.master.countries().forEach(c => map.set(c.name.toLowerCase(), c.flag_emoji));
    return map;
  });

  flagOf(name?: string): string {
    if (!name) return '';
    return this.flagMap().get(name.toLowerCase()) ?? '';
  }

  get firstTarget(): string { return this.candidate.target_locations?.[0] ?? ''; }

  get englishLabel(): string {
    const map: Record<string, string> = {
      basic: 'A1', conversational: 'B1', fluent: 'C1', native: 'Native',
      a1: 'A1', a2: 'A2', b1: 'B1', b2: 'B2', c1: 'C1', c2: 'C2',
    };
    const lvl = this.candidate.english_level;
    return lvl ? (map[lvl.toLowerCase()] ?? lvl) : '';
  }

  /** 'pending' | 'approved' | null (show button) */
  get requestStatus(): 'pending' | 'approved' | null {
    if (!this.interestRequest) return null;
    if (this.interestRequest.status === 'pending')  return 'pending';
    if (this.interestRequest.status === 'approved') return 'approved';
    return null; // rejected or revoked → show button again
  }
}
