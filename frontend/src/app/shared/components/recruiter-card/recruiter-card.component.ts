// src/app/shared/components/recruiter-card/recruiter-card.component.ts
import { Component, Input, Output, EventEmitter, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Recruiter } from '../../../core/models/recruiter.model';
import { MasterDataService } from '../../../core/services/master-data.service';

@Component({
  selector: 'app-recruiter-card',
  standalone: true,
  imports: [CommonModule, RouterLink, DatePipe],
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
        <i class="bi bi-person-fill rc-card__contact-icon"></i>
        <div>
          <div class="rc-card__contact-name">{{ recruiter.contact_name }}</div>
          @if (recruiter.contact_job_title) {
            <div class="rc-card__contact-role">{{ recruiter.contact_job_title }}</div>
          }
        </div>
      </div>

      <!-- ── Location + industry + sponsor ── -->
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
        @if (sponsorInfo) {
          <span class="rc-badge rc-badge--sm {{ sponsorInfo.cls }}">{{ sponsorInfo.label }}</span>
        }
      </div>

      <!-- ── Activity metrics ── -->
      <div class="rc-card__metrics">
        <div class="rc-card__metric">
          <span class="rc-card__metric-val">{{ recruiter.shortlists_count ?? 0 }}</span>
          <span class="rc-card__metric-lbl"><i class="bi bi-people-fill"></i> Shortlisted</span>
        </div>
        <div class="rc-card__metric-sep"></div>
        <div class="rc-card__metric">
          <span class="rc-card__metric-val">{{ recruiter.contact_requests_count ?? 0 }}</span>
          <span class="rc-card__metric-lbl"><i class="bi bi-chat-dots-fill"></i> Contacts</span>
        </div>
      </div>

      <!-- ── Dates ── -->
      <div class="rc-card__dates">
        @if (recruiter.created_at) {
          <span>
            <i class="bi bi-calendar3"></i>
            Joined {{ recruiter.created_at | date:'MMM yyyy' }}
          </span>
        }
        <span class="rc-card__dot">·</span>
        <span>
          <i class="bi bi-activity"></i>
          {{ relativeTime(recruiter.last_login_at) }}
        </span>
      </div>

      <!-- ── Actions ── -->
      <div class="rc-card__actions">
        <a [routerLink]="['/admin/recruiters', recruiter.id]"
          class="rc-card__action rc-card__action--view" title="View profile">
          <i class="bi bi-eye"></i><span>View</span>
        </a>
        <button class="rc-card__action rc-card__action--edit"
          (click)="edit.emit()" title="Edit">
          <i class="bi bi-pencil"></i><span>Edit</span>
        </button>
        <button class="rc-card__action rc-card__action--mail"
          (click)="resendCreds.emit()" title="Resend credentials">
          <i class="bi bi-envelope"></i>
        </button>
        <button class="rc-card__action"
          [class.rc-card__action--activate]="!recruiter.is_active"
          [class.rc-card__action--deactivate]="recruiter.is_active"
          (click)="toggleActive.emit()"
          [title]="recruiter.is_active ? 'Deactivate' : 'Activate'">
          <i class="bi"
            [class.bi-person-check-fill]="!recruiter.is_active"
            [class.bi-person-x-fill]="recruiter.is_active"></i>
        </button>
        <button class="rc-card__action rc-card__action--danger"
          (click)="delete.emit()" title="Delete">
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

  constructor(private master: MasterDataService) {}

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
    if (!this.recruiter.is_active) return { label: 'Inactive',      cls: 'rc-badge--inactive' };
    if (this.isExpired)            return { label: 'Expired',       cls: 'rc-badge--expired'  };
    return                                { label: 'Active',        cls: 'rc-badge--active'   };
  }

  get sponsorInfo(): { label: string; cls: string } | null {
    switch (this.recruiter.has_sponsor_licence) {
      case 'yes':     return { label: '✓ Verified',     cls: 'rc-badge--sponsor-yes'     };
      case 'no':      return { label: '✕ Not Verified', cls: 'rc-badge--sponsor-no'      };
      case 'unknown': return { label: '⏳ Pending',      cls: 'rc-badge--sponsor-pending' };
      default:        return null;
    }
  }

  relativeTime(dateStr: string | undefined): string {
    if (!dateStr) return 'Never logged in';
    const diff  = Date.now() - new Date(dateStr).getTime();
    const days  = Math.floor(diff / 86_400_000);
    if (days === 0) return 'Active today';
    if (days === 1) return 'Active 1 day ago';
    if (days < 30)  return `Active ${days} days ago`;
    const months = Math.floor(days / 30);
    if (months === 1) return 'Active 1 month ago';
    if (months < 12)  return `Active ${months} months ago`;
    const years = Math.floor(months / 12);
    return `Active ${years} yr${years > 1 ? 's' : ''} ago`;
  }
}
