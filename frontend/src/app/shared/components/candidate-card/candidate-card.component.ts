// src/app/shared/components/candidate-card/candidate-card.component.ts
import { Component, Input, Output, EventEmitter, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LocaleDatePipe } from '../../../core/pipes/locale-date.pipe';
import { Candidate } from '../../../core/models/candidate.model';
import { MasterDataService } from '../../../core/services/master-data.service';

@Component({
  selector: 'app-candidate-card',
  standalone: true,
  imports: [LocaleDatePipe, CommonModule, RouterLink, TranslateModule],
  styles: [':host { display: block; height: 100%; }'],
  template: `
    <div class="cl-card" [class.cl-card--selected]="selected">

      <!-- ── Header: checkbox + number + status ── -->
      <div class="cl-card__head">
        <label class="cl-card__check" (click)="$event.stopPropagation()">
          <input type="checkbox" [checked]="selected"
            (change)="selectedChange.emit(!selected)">
        </label>
        @if (candidate.login_id) {
          <span class="autocode-badge autocode-badge--login-id autocode-badge--sm">{{ candidate.login_id }}</span>
        }
        <span class="badge rounded-pill ms-auto"
          [class.badge-status-active]="candidate.profile_status === 'active'"
          [class.badge-status-pending]="candidate.profile_status === 'pending_edit'"
          [class.badge-status-inactive]="candidate.profile_status === 'inactive'">
          {{ candidate.profile_status | titlecase }}
        </span>
      </div>

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
        <div class="cl-card__job text-muted">
          {{ candidate.job_title || candidate.occupation || '—' }}
        </div>
      </div>

      <!-- ── Location chips ── -->
      <div class="cl-card__location">
        @if (candidate.nationality) {
          <span class="cl-card__loc-chip">
            🪪 {{ flagOf(candidate.nationality) }} {{ candidate.nationality }}
          </span>
        }
        @if (candidate.current_country) {
          <span class="cl-card__loc-chip">
            <i class="bi bi-geo-alt-fill"></i>
            {{ flagOf(candidate.current_country) }} {{ candidate.current_city ? candidate.current_city + ', ' : '' }}{{ candidate.current_country }}
          </span>
        }
        @if (firstTarget) {
          <span class="cl-card__loc-chip cl-card__loc-chip--target">
            → {{ flagOf(firstTarget) }} {{ firstTarget }}
          </span>
        }
      </div>

      <!-- ── Stats row: industry · exp · english ── -->
      <div class="cl-card__stats">
        @if (candidate.occupation) {
          <span class="cl-card__stat">
            <i class="bi bi-building"></i> {{ candidate.occupation }}
          </span>
        }
         @if (candidate.years_experience != null) {
           <span class="cl-card__stat">
             <i class="bi bi-clock-history"></i> {{ candidate.years_experience }} {{ 'COMMON.years' | translate }}
           </span>
         }
        @if (englishLabel) {
          <span class="cl-card__stat">
            <i class="bi bi-translate"></i> {{ englishLabel }}
          </span>
        }
      </div>

      <!-- ── Flags: fee + video ── -->
      <div class="cl-card__flags">
        <span class="cl-card__flag"
          [class.cl-card__flag--paid]="candidate.registration_fee_status === 'paid'"
          [class.cl-card__flag--pending]="candidate.registration_fee_status === 'pending_payment'"
          [class.cl-card__flag--waived]="candidate.registration_fee_status === 'waived'">
          @if (candidate.registration_fee_status === 'paid') {
            <i class="bi bi-check-circle-fill"></i>
          } @else if (candidate.registration_fee_status === 'pending_payment') {
            <i class="bi bi-clock-fill"></i>
          } @else {
            <i class="bi bi-dash-circle"></i>
          }
          {{ feeLabel }}
        </span>
         <span class="cl-card__flag" [class.cl-card__flag--has-video]="!!candidate.intro_video_url"
           [class.cl-card__flag--no-video]="!candidate.intro_video_url">
           @if (candidate.intro_video_url) {
             <i class="bi bi-camera-video-fill"></i> {{ 'COMMON.view' | translate }}
           } @else {
             <i class="bi bi-camera-video-off"></i> {{ 'EDIT_REQUEST.media_changes' | translate }}
           }
         </span>
      </div>

       <!-- ── Profile completion bar ── -->
       <div class="cl-card__completion">
         <div class="cl-card__completion-header">
           <span>{{ 'MY_PROFILE.title' | translate }}</span>
           <span class="cl-card__completion-pct" [style.color]="completionColor">
             {{ completionPercent }}%
           </span>
         </div>
         <div class="cl-card__bar">
           <div class="cl-card__bar-fill"
             [style.width.%]="completionPercent"
             [style.background]="completionColor">
           </div>
         </div>
       </div>

      <!-- ── Last updated ── -->
      <div class="cl-card__updated">
        <i class="bi bi-calendar3 me-1"></i>
        {{ (candidate.updated_at || candidate.created_at) | localeDate:'mediumDate' }}
      </div>

       <!-- ── Actions footer ── -->
       <div class="cl-card__actions">
         <a [routerLink]="['/admin/candidates', candidate.id]"
           class="cl-card__action cl-card__action--view" [title]="('COMMON.view' | translate)">
           <i class="bi bi-eye"></i>
           <span>{{ 'COMMON.view' | translate }}</span>
         </a>
         <a [routerLink]="['/admin/candidates', candidate.id, 'edit']"
           class="cl-card__action cl-card__action--edit" [title]="('COMMON.edit' | translate)">
           <i class="bi bi-pencil"></i>
           <span>{{ 'COMMON.edit' | translate }}</span>
         </a>
          <button class="cl-card__action cl-card__action--forward"
            (click)="forwardToEmployer.emit()" [title]="'COMMON.forwarded' | translate">
            <i class="bi bi-send-fill"></i>
            <span>{{ 'COMMON.forwarded' | translate }}</span>
          </button>
          <button class="cl-card__action cl-card__action--mail"
            (click)="resendCreds.emit()" [title]="'COMMON.resend_code' | translate">
            <i class="bi bi-envelope"></i>
         </button>
         <button class="cl-card__action cl-card__action--danger"
           (click)="deleteCandidate.emit()" [title]="'COMMON.delete' | translate">
           <i class="bi bi-trash"></i>
         </button>
      </div>

    </div>
  `,
})
export class CandidateCardComponent {
  @Input({ required: true }) candidate!: Candidate;
  @Input() selected = false;
  @Output() selectedChange     = new EventEmitter<boolean>();
  @Output() resendCreds        = new EventEmitter<void>();
  @Output() deleteCandidate    = new EventEmitter<void>();
  @Output() forwardToEmployer  = new EventEmitter<void>();

  constructor(private master: MasterDataService, private translate: TranslateService) {}

  private translateKey(key: string): string {
    return this.translate.instant(key);
  }

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
      // Legacy values (mapped during migration, kept for safety)
      basic: 'A1', conversational: 'B1', fluent: 'C1', native: 'Native',
      // CEFR values
      a1: 'A1', a2: 'A2', b1: 'B1', b2: 'B2', c1: 'C1', c2: 'C2',
    };
    const lvl = this.candidate.english_level;
    return lvl ? (map[lvl.toLowerCase()] ?? lvl) : '';
  }

  get feeLabel(): string {
    const map: Record<string, string> = {
      paid: 'fee_paid',
      pending_payment: 'fee_pending',
      waived: 'fee_waived',
    };
    const key = this.candidate.registration_fee_status
      ? (map[this.candidate.registration_fee_status] ?? '—') : '—';
    return key !== '—' ? this.translateKey(key) : '—';
  }

  get completionPercent(): number {
    const c = this.candidate;
    let score = 15; // name always present
    if (c.profile_photo_url)          score += 15;
    if (c.job_title)                  score += 10;
    if (c.industry)                   score += 10;
    if (c.current_country)            score += 10;
    if (c.nationality)                score +=  5;
    if (c.years_experience != null)   score += 10;
    if (c.english_level)              score += 10;
    if (c.intro_video_url)            score += 10;
    if (c.target_locations?.length)   score +=  5;
    return Math.min(score, 100);
  }

  get completionColor(): string {
    const p = this.completionPercent;
    if (p >= 80) return 'var(--th-emerald)';
    if (p >= 50) return 'var(--th-amber)';
    return 'var(--th-rose)';
  }
}
