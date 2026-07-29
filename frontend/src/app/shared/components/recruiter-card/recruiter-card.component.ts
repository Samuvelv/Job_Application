// src/app/shared/components/recruiter-card/recruiter-card.component.ts
import { Component, Input, Output, EventEmitter, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LocaleDatePipe } from '../../../core/pipes/locale-date.pipe';
import { Recruiter } from '../../../core/models/recruiter.model';
import { MasterDataService } from '../../../core/services/master-data.service';

@Component({
  selector: 'app-recruiter-card',
  standalone: true,
  imports: [LocaleDatePipe, CommonModule, RouterLink, DatePipe, TranslateModule],
  template: `
    <div class="rc-card" [class.rc-card--inactive]="!recruiter.is_active || isExpired">

      <!-- ── Header: logo/avatar + company + number + status ── -->
      <div class="rc-card__head">
        <div class="rc-card__logo-wrap">
          @if (recruiter.company_logo_url) {
            <img [src]="recruiter.company_logo_url" class="rc-card__logo" alt=""
              (error)="$any($event.target).style.display='none'">
          } @else {
            <div class="rc-card__logo-fallback">{{ initials }}</div>
          }
        </div>
        <div class="rc-card__head-meta">
          <div class="rc-card__company">{{ recruiter.company_name || 'Independent' }}</div>
          @if (recruiter.recruiter_number) {
            <span class="autocode-badge autocode-badge--sm">{{ recruiter.recruiter_number }}</span>
          }
        </div>
        <span class="rc-badge {{ statusInfo.cls }}">{{ statusInfo.label }}</span>
      </div>

      <!-- ── Contact person ── -->
      <div class="rc-card__contact">
        <i class="bi bi-person-circle rc-card__contact-icon"></i>
        <div class="rc-card__contact-name">{{ recruiter.contact_name }}</div>
        @if (recruiter.contact_job_title) {
          <div class="rc-card__contact-role">{{ recruiter.contact_job_title }}</div>
        }
      </div>

      <!-- ── Location + industry + type + sponsor ── -->
      <div class="rc-card__tags">
        @if (recruiter.company_country) {
          <span class="rc-card__tag">
            <i class="bi bi-geo-alt-fill"></i>
            {{ flagOf(recruiter.company_country) }} {{ recruiter.company_country }}
          </span>
        }
        @if (recruiter.industry) {
          <span class="rc-card__tag rc-card__tag--industry">
            <i class="bi bi-building"></i> {{ recruiter.industry }}
          </span>
        }
        <span class="rc-badge rc-badge--sm {{ typeInfo.cls }}">{{ typeInfo.label }}</span>
        @if (sponsorInfo) {
          <span class="rc-badge rc-badge--sm {{ sponsorInfo.cls }}">{{ sponsorInfo.label }}</span>
        }
      </div>

       <!-- ── Activity metrics ── -->
       <div class="rc-card__metrics">
         <div class="rc-card__metric">
           <span class="rc-card__metric-val">{{ recruiter.shortlists_count ?? 0 }}</span>
           <span class="rc-card__metric-lbl"><i class="bi bi-people-fill"></i> {{ 'COMMON.search' | translate }}</span>
         </div>
         <div class="rc-card__metric-sep"></div>
         <div class="rc-card__metric">
           <span class="rc-card__metric-val">{{ recruiter.profiles_viewed_count ?? 0 }}</span>
           <span class="rc-card__metric-lbl"><i class="bi bi-eye-fill"></i> {{ 'COMMON.view' | translate }}</span>
         </div>
         <div class="rc-card__metric-sep"></div>
         <div class="rc-card__metric">
           <span class="rc-card__metric-val">{{ recruiter.contact_requests_count ?? 0 }}</span>
           <span class="rc-card__metric-lbl"><i class="bi bi-chat-dots-fill"></i> {{ 'COMMON.message' | translate }}</span>
         </div>
       </div>

       <!-- ── Dates ── -->
        <div class="rc-card__dates">
          @if (recruiter.created_at) {
            <span>
              <i class="bi bi-calendar3"></i>
              {{ 'COMMON.joined' | translate }} {{ recruiter.created_at | localeDate:'MMM yyyy' }}
            </span>
          }
          <span class="rc-card__dot">·</span>
          <span>
            <i class="bi bi-clock"></i>
            {{ 'RECRUITER.last_login' | translate }}:
            @if (recruiter.last_login_at) {
              {{ recruiter.last_login_at | localeDate:'dd MMM yyyy' }}
            } @else {
              {{ 'COMMON.never' | translate }}
            }
          </span>
        </div>

        <!-- ── Actions ── -->
        <div class="cl-card__actions">
          <a [routerLink]="['/admin/recruiters', recruiter.id]"
            class="cl-card__action cl-card__action--view" [title]="('COMMON.view' | translate)">
            <i class="bi bi-eye"></i><span>{{ 'COMMON.view' | translate }}</span>
          </a>
          <button class="cl-card__action cl-card__action--edit"
            (click)="edit.emit()" [title]="('COMMON.edit' | translate)">
            <i class="bi bi-pencil"></i><span>{{ 'COMMON.edit' | translate }}</span>
          </button>
          <button class="cl-card__action cl-card__action--mail"
            (click)="resendCreds.emit()" [title]="'COMMON.resend_credentials' | translate">
            <i class="bi bi-envelope"></i>
          </button>
          <button class="cl-card__action"
            [class.cl-card__action--activate]="!recruiter.is_active"
            [class.cl-card__action--deactivate]="recruiter.is_active"
            (click)="toggleActive.emit()"
            [title]="recruiter.is_active ? ('COMMON.active' | translate) : ('COMMON.inactive' | translate)">
            <i class="bi"
              [class.bi-person-check-fill]="!recruiter.is_active"
              [class.bi-person-x-fill]="recruiter.is_active"></i>
          </button>
          <button class="cl-card__action cl-card__action--danger"
            (click)="delete.emit()" [title]="('COMMON.delete' | translate)">
            <i class="bi bi-trash"></i>
          </button>
        </div>

    </div>
  `,
})
export class RecruiterCardComponent {
  @Input({ required: true }) recruiter!: Recruiter;
  @Output() edit          = new EventEmitter<void>();
  @Output() delete        = new EventEmitter<void>();
  @Output() resendCreds   = new EventEmitter<void>();
  @Output() toggleActive  = new EventEmitter<void>();

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

  get initials(): string {
    return this.recruiter.contact_name
      .split(' ').slice(0, 2).map(p => p[0] ?? '').join('').toUpperCase();
  }

  get isExpired(): boolean {
    return new Date(this.recruiter.access_expires_at) < new Date();
  }

  get statusInfo(): { label: string; cls: string } {
    if (!this.recruiter.is_active) return { label: this.translateKey('COMMON.inactive'), cls: 'rc-badge--inactive' };
    if (this.isExpired)            return { label: this.translateKey('COMMON.expired'),  cls: 'rc-badge--expired'  };
    return                                { label: this.translateKey('COMMON.active'),   cls: 'rc-badge--active'   };
  }

  get typeInfo(): { label: string; cls: string } {
    if (this.recruiter.type === 'recruitment_agency') {
      return { label: this.translateKey('RECRUITER.recruitment_agency'), cls: 'rc-badge--type-agency' };
    }
    return { label: this.translateKey('RECRUITER.direct_employer'), cls: 'rc-badge--type-employer' };
  }

  get sponsorInfo(): { label: string; cls: string } | null {
    switch (this.recruiter.has_sponsor_licence) {
      case 'yes':     return { label: `✓ ${this.translateKey('COMMON.verified')}`, cls: 'rc-badge--sponsor-yes'     };
      case 'no':      return { label: `✕ ${this.translateKey('RECRUITER.not_verified')}`, cls: 'rc-badge--sponsor-no'      };
      case 'unknown': return { label: `⏳ ${this.translateKey('COMMON.pending')}`, cls: 'rc-badge--sponsor-pending' };
      default:        return null;
    }
  }

}

