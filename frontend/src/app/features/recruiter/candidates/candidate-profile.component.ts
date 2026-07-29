// src/app/features/recruiter/candidates/candidate-profile.component.ts
import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { catchError, forkJoin, of } from 'rxjs';
import { CandidateService } from '../../../core/services/candidate.service';
import { RecruiterService } from '../../../core/services/recruiter.service';
import { ContactRequestService } from '../../../core/services/contact-request.service';
import { InterestRequestService, InterestRequest } from '../../../core/services/interest-request.service';
import { MasterDataService } from '../../../core/services/master-data.service';
import { Candidate } from '../../../core/models/candidate.model';
import { ContactRequest } from '../../../core/models/contact-request.model';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CandidateProfileComponent } from '../../../shared/components/candidate-profile/candidate-profile.component';
import { SearchableSelectComponent, SelectOption } from '../../../shared/components/searchable-select/searchable-select.component';
import {
  CandidateTranslationService,
  TRANSLATE_LANGUAGES,
  TranslateLanguage,
} from '../../../core/services/candidate-translation.service';

@Component({
  selector: 'app-recruiter-candidate-profile',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, PageHeaderComponent, CandidateProfileComponent, SearchableSelectComponent, TranslateModule],
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
    .reason-form {
      background: var(--th-surface);
      border: 1px solid var(--th-border-strong);
      border-radius: 10px;
      padding: 12px 14px;
      min-width: 280px;
      max-width: 420px;
    }
    .reason-form__label {
      font-size: 12px;
      font-weight: 600;
      color: var(--th-text-secondary);
      margin-bottom: 6px;
    }
    .reason-form__textarea {
      width: 100%;
      border-radius: 6px;
      border: 1px solid var(--th-border-strong);
      padding: 7px 10px;
      font-size: 13px;
      background: var(--th-surface-2);
      color: var(--th-text);
      resize: vertical;
    }
    .reason-form__textarea:focus {
      outline: none;
      border-color: var(--th-primary);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--th-primary) 15%, transparent);
    }

    /* ── Translation bar ──────────────────────────────────────────────────── */
    .translate-bar {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    /* Trigger button — mirrors .lang-btn */
    .tr-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 30px;
      padding: 0 10px;
      border: 1px solid var(--th-border);
      border-radius: var(--th-radius);
      background: var(--th-surface);
      color: var(--th-text);
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: border-color .15s, background .15s;
      white-space: nowrap;
    }
    .tr-btn:hover:not(:disabled) {
      border-color: var(--th-border-strong);
      background: var(--th-surface-2, var(--th-surface));
    }
    .tr-btn:disabled { opacity: .6; cursor: not-allowed; }
    .tr-btn__flag  { font-size: 15px; line-height: 1; }
    .tr-btn__label { font-size: 13px; }
    .tr-btn__caret { font-size: 10px; opacity: .6; transition: transform .2s; }
    .tr-btn--open .tr-btn__caret { transform: rotate(180deg); }

    /* Dropdown panel — mirrors .lang-dropdown */
    .tr-dropdown-wrap { position: relative; }
    .tr-dropdown {
      position: absolute;
      top: calc(100% + 6px);
      left: 0;
      min-width: 200px;
      max-height: 320px;
      overflow-y: auto;
      background: var(--th-surface);
      border: 1px solid var(--th-border);
      border-radius: var(--th-radius-xl);
      box-shadow: 0 8px 24px rgba(0,0,0,.12);
      z-index: 1100;
      padding: 6px;
      animation: trFadeIn .15s ease;
    }
    @keyframes trFadeIn {
      from { opacity: 0; transform: translateY(-6px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .tr-dropdown__label {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: .08em;
      text-transform: uppercase;
      color: var(--th-muted);
      padding: 4px 8px 6px;
    }
    .tr-option {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 10px;
      border-radius: var(--th-radius);
      cursor: pointer;
      border: none;
      background: transparent;
      width: 100%;
      text-align: start;
      color: var(--th-text);
      font-size: 13px;
      transition: background .12s;
    }
    .tr-option:hover { background: var(--th-surface-2, rgba(0,0,0,.05)); }
    .tr-option--active {
      background: var(--th-primary-soft, rgba(99,102,241,.1));
      font-weight: 600;
    }
    .tr-option__flag  { font-size: 17px; line-height: 1; flex-shrink: 0; }
    .tr-option__name  { flex: 1; }
    .tr-option__check { color: var(--th-primary); font-size: 12px; flex-shrink: 0; }
    .translate-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      height: 30px;
      padding: 0 12px;
      border-radius: 6px;
      border: 1px solid var(--th-primary);
      background: transparent;
      color: var(--th-primary);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: background .15s, color .15s;
      white-space: nowrap;
    }
    .translate-btn:hover:not(:disabled) {
      background: var(--th-primary);
      color: #fff;
    }
    .translate-btn:disabled {
      opacity: .6;
      cursor: not-allowed;
    }
    .translated-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 3px 10px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: .04em;
      text-transform: uppercase;
      background: color-mix(in srgb, var(--th-primary) 12%, transparent);
      color: var(--th-primary);
      border: 1px solid color-mix(in srgb, var(--th-primary) 30%, transparent);
    }
    .show-original-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      height: 26px;
      padding: 0 10px;
      border-radius: 6px;
      border: 1px solid var(--th-border-strong);
      background: transparent;
      color: var(--th-muted);
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: border-color .15s, color .15s;
    }
    .show-original-btn:hover {
      border-color: var(--th-text);
      color: var(--th-text);
    }
  `],
  template: `
    <!-- Back button + action bar -->
    <div class="d-flex align-items-center gap-3 mb-3 flex-wrap">
      <a [routerLink]="backLink" class="btn btn-sm btn-outline-secondary">
        <i class="bi bi-arrow-left me-1"></i>{{ backLabel | translate }}
      </a>

      @if (candidate) {
        <div class="ms-auto d-flex align-items-center gap-2 flex-wrap">

          <!-- ── Translation bar ─────────────────────────────────────────── -->
          @if (canTranslate) {
          <div class="translate-bar">
            @if (!translated()) {
              <!-- Language selector dropdown + Translate button -->
              <div class="tr-dropdown-wrap" (click)="$event.stopPropagation()">
                <button
                  class="tr-btn"
                  [class.tr-btn--open]="translateDropdownOpen()"
                  [disabled]="translating()"
                  (click)="toggleTranslateDropdown()"
                  type="button">
                  <span class="tr-btn__flag">{{ activeLangFlag() }}</span>
                  <span class="tr-btn__label">{{ activeLangLabel() }}</span>
                  <i class="bi bi-chevron-down tr-btn__caret"></i>
                </button>
                @if (translateDropdownOpen()) {
                  <div class="tr-dropdown" role="listbox">
                    <div class="tr-dropdown__label">Translate to</div>
                    @for (lang of translateLanguages; track lang.code) {
                      <button
                        class="tr-option"
                        [class.tr-option--active]="lang.code === selectedLangCode"
                        role="option"
                        [attr.aria-selected]="lang.code === selectedLangCode"
                        type="button"
                        (click)="selectTranslateLang(lang.code)">
                        <span class="tr-option__flag">{{ lang.flag }}</span>
                        <span class="tr-option__name">{{ lang.label }}</span>
                        @if (lang.code === selectedLangCode) {
                          <i class="bi bi-check2 tr-option__check"></i>
                        }
                      </button>
                    }
                  </div>
                }
              </div>
              <button
                class="translate-btn"
                (click)="translateProfile()"
                [disabled]="translating()">
                @if (translating()) {
                  <span class="spinner-border spinner-border-sm" style="width:.75rem;height:.75rem;border-width:2px;"></span>
                  Translating…
                } @else {
                  <i class="bi bi-translate"></i> Translate
                }
              </button>
            } @else {
              <!-- Translated state: badge + show original -->
              <span class="translated-badge">
                <i class="bi bi-translate"></i>
                Translated · {{ activeLangLabel() }}
              </span>
              <button class="show-original-btn" (click)="showOriginal()">
                <i class="bi bi-arrow-counterclockwise"></i> Show Original
              </button>
            }
          </div>
          }
          <!-- ── End translation bar ─────────────────────────────────────── -->

          <!-- Direct employer: contact request button -->
          @if (!isAgency) {
            @if (contactRequestStatus === 'approved') {
              <span class="contact-status-badge contact-status-badge--approved">
                <i class="bi bi-unlock-fill"></i>{{ 'CONTACT_STATUS.unlocked' | translate }}
              </span>
            } @else if (contactRequestStatus === 'pending') {
              <span class="contact-status-badge contact-status-badge--pending">
                <i class="bi bi-hourglass-split"></i>{{ 'CONTACT_STATUS.pending_badge' | translate }}
              </span>
            } @else if (contactRequestStatus === 'rejected') {
              <div class="d-flex align-items-center gap-2 flex-wrap">
                <span class="contact-status-badge contact-status-badge--rejected">
                  <i class="bi bi-x-circle-fill"></i>{{ 'CONTACT_STATUS.rejected_badge' | translate }}
                </span>
                @if (!showReasonForm) {
                  <button class="btn btn-sm btn-outline-primary" (click)="showReasonForm = true; requestReason = ''; reasonTouched = false">
                    <i class="bi bi-arrow-repeat me-1"></i>{{ 'CONTACT_STATUS.re_request' | translate }}
                  </button>
                }
              </div>
              @if (showReasonForm) {
                <div class="reason-form" (click)="$event.stopPropagation()">
                  <div class="reason-form__label">
                    <i class="bi bi-chat-left-text me-1"></i>{{ 'CONTACT_STATUS.reason_for_request' | translate }} <span style="color:var(--th-danger,#f43f5e)">*</span>
                  </div>
                  <textarea class="reason-form__textarea" rows="3" maxlength="1000"
                    [(ngModel)]="requestReason"
                    [class.is-invalid]="reasonTouched && !requestReason.trim()"
                    (blur)="reasonTouched = true"
                    [placeholder]="'CONTACT_STATUS.reason_placeholder' | translate"></textarea>
                  @if (reasonTouched && !requestReason.trim()) {
                    <div style="font-size:.75rem;color:var(--th-danger,#f43f5e);margin-top:.25rem;">
                      <i class="bi bi-exclamation-circle me-1"></i>{{ 'CONTACT_STATUS.reason_required' | translate }}
                    </div>
                  }
                  <div class="d-flex gap-2 mt-2">
                    <button class="btn btn-sm btn-primary" (click)="requestContactInfo()" [disabled]="requesting || !requestReason.trim()">
                      @if (requesting) {
                        <span class="spinner-border spinner-border-sm me-1"></span>{{ 'CONTACT_STATUS.submitting' | translate }}
                      } @else {
                        <i class="bi bi-send me-1"></i>{{ 'CONTACT_STATUS.submit_request' | translate }}
                      }
                    </button>
                    <button class="btn btn-sm btn-outline-secondary" (click)="showReasonForm = false; reasonTouched = false" [disabled]="requesting">
                      {{ 'COMMON.cancel' | translate }}
                    </button>
                  </div>
                </div>
              }
            } @else if (contactRequestStatus === 'revoked') {
              <div class="d-flex align-items-center gap-2 flex-wrap">
                <span class="contact-status-badge contact-status-badge--revoked">
                  <i class="bi bi-shield-x-fill"></i>{{ 'CONTACT_STATUS.revoked_badge' | translate }}
                </span>
                @if (!showReasonForm) {
                  <button class="btn btn-sm btn-outline-primary" (click)="showReasonForm = true; requestReason = ''; reasonTouched = false">
                    <i class="bi bi-arrow-repeat me-1"></i>{{ 'CONTACT_STATUS.request_again' | translate }}
                  </button>
                }
              </div>
              @if (showReasonForm) {
                <div class="reason-form" (click)="$event.stopPropagation()">
                  <div class="reason-form__label">
                    <i class="bi bi-chat-left-text me-1"></i>{{ 'CONTACT_STATUS.reason_for_request' | translate }} <span style="color:var(--th-danger,#f43f5e)">*</span>
                  </div>
                  <textarea class="reason-form__textarea" rows="3" maxlength="1000"
                    [(ngModel)]="requestReason"
                    [class.is-invalid]="reasonTouched && !requestReason.trim()"
                    (blur)="reasonTouched = true"
                    [placeholder]="'CONTACT_STATUS.reason_placeholder' | translate"></textarea>
                  @if (reasonTouched && !requestReason.trim()) {
                    <div style="font-size:.75rem;color:var(--th-danger,#f43f5e);margin-top:.25rem;">
                      <i class="bi bi-exclamation-circle me-1"></i>{{ 'CONTACT_STATUS.reason_required' | translate }}
                    </div>
                  }
                  <div class="d-flex gap-2 mt-2">
                    <button class="btn btn-sm btn-primary" (click)="requestContactInfo()" [disabled]="requesting || !requestReason.trim()">
                      @if (requesting) {
                        <span class="spinner-border spinner-border-sm me-1"></span>{{ 'CONTACT_STATUS.submitting' | translate }}
                      } @else {
                        <i class="bi bi-send me-1"></i>{{ 'CONTACT_STATUS.submit_request' | translate }}
                      }
                    </button>
                    <button class="btn btn-sm btn-outline-secondary" (click)="showReasonForm = false; reasonTouched = false" [disabled]="requesting">
                      {{ 'COMMON.cancel' | translate }}
                    </button>
                  </div>
                </div>
              }
            } @else {
              @if (showReasonForm) {
                <div class="reason-form" (click)="$event.stopPropagation()">
                  <div class="reason-form__label">
                    <i class="bi bi-chat-left-text me-1"></i>{{ 'CONTACT_STATUS.reason_for_request' | translate }} <span style="color:var(--th-danger,#f43f5e)">*</span>
                  </div>
                  <textarea class="reason-form__textarea" rows="3" maxlength="1000"
                    [(ngModel)]="requestReason"
                    [class.is-invalid]="reasonTouched && !requestReason.trim()"
                    (blur)="reasonTouched = true"
                    [placeholder]="'CONTACT_STATUS.reason_placeholder' | translate"></textarea>
                  @if (reasonTouched && !requestReason.trim()) {
                    <div style="font-size:.75rem;color:var(--th-danger,#f43f5e);margin-top:.25rem;">
                      <i class="bi bi-exclamation-circle me-1"></i>{{ 'CONTACT_STATUS.reason_required' | translate }}
                    </div>
                  }
                  <div class="d-flex gap-2 mt-2">
                    <button class="btn btn-sm btn-primary" (click)="requestContactInfo()" [disabled]="requesting || !requestReason.trim()">
                      @if (requesting) {
                        <span class="spinner-border spinner-border-sm me-1"></span>{{ 'CONTACT_STATUS.submitting' | translate }}
                      } @else {
                        <i class="bi bi-send me-1"></i>{{ 'CONTACT_STATUS.submit_request' | translate }}
                      }
                    </button>
                    <button class="btn btn-sm btn-outline-secondary" (click)="showReasonForm = false; reasonTouched = false" [disabled]="requesting">
                      {{ 'COMMON.cancel' | translate }}
                    </button>
                  </div>
                </div>
              } @else {
                <button class="btn btn-sm btn-primary" (click)="showReasonForm = true">
                  <i class="bi bi-person-lines-fill me-1"></i>{{ 'CONTACT_STATUS.request_contact' | translate }}
                </button>
              }
            }
          }

          <!-- Shortlist -->
          @if (shortlisted) {
            <span class="badge rounded-pill px-3 py-2"
              style="background:var(--th-emerald-soft);color:var(--th-emerald);font-size:.8rem;">
              <i class="bi bi-bookmark-star-fill me-1"></i>{{ 'SHORTLIST.shortlisted_badge' | translate }}
            </span>
          } @else {
            <button class="btn btn-outline-primary btn-sm" (click)="addToShortlist()" [disabled]="shortlisting">
              @if (shortlisting) {
                <span class="spinner-border spinner-border-sm me-1"></span>{{ 'COMMON.loading' | translate }}
              } @else {
                <i class="bi bi-bookmark-plus me-1"></i>{{ 'CANDIDATE_CARD.add_to_shortlist' | translate }}
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
        <strong>{{ 'CONTACT_STATUS.admin_note' | translate }}</strong> {{ contactRequest!.admin_note }}
      </div>
    }

    <!-- Contact access revoked note (direct employers only) -->
    @if (!isAgency && contactRequestStatus === 'revoked') {
      <div class="alert alert-secondary small py-2 mb-3">
        <i class="bi bi-shield-x me-1"></i>
        <strong>{{ 'CONTACT_STATUS.access_revoked_note' | translate }}</strong>
        @if (contactRequest?.revocation_reason) {
          {{ 'CONTACT_STATUS.reason_label' | translate }} {{ contactRequest!.revocation_reason }}
        }
        {{ 'CONTACT_STATUS.resubmit_note' | translate }}
      </div>
    }

    <!-- Agency: interest request panel -->
    @if (isAgency && candidate) {
      <div class="interest-panel">
        <div class="interest-panel__title"><i class="bi bi-briefcase-fill me-2" style="color:var(--th-primary)"></i>{{ 'INTEREST_REQUESTS.submit_interest_title' | translate }}</div>
        <div class="interest-panel__sub">
          {{ 'INTEREST_REQUESTS.agency_intro' | translate }}
        </div>

        @if (interestRequest) {
          <!-- Existing request status -->
          <div class="d-flex align-items-center gap-3 flex-wrap">
            <span class="interest-status-badge interest-status-badge--{{ interestRequest.status }}">
              <i class="bi"
                [class.bi-hourglass-split]="interestRequest.status === 'pending'"
                [class.bi-check-circle-fill]="interestRequest.status === 'approved'"
                [class.bi-x-circle-fill]="interestRequest.status === 'rejected'"
                [class.bi-slash-circle-fill]="interestRequest.status === 'revoked'"></i>
              {{ interestRequest.status === 'pending'  ? ('INTEREST_REQUESTS.status_pending'      | translate) :
                 interestRequest.status === 'approved' ? ('INTEREST_REQUESTS.status_approved'     | translate) :
                 interestRequest.status === 'revoked'  ? ('INTEREST_REQUESTS.status_revoked'      | translate) :
                 ('INTEREST_REQUESTS.status_not_approved' | translate) }}
            </span>
          </div>
          @if (interestRequest.admin_note) {
            <div class="mt-2 small" style="color:var(--th-muted);">
              <i class="bi bi-chat-left-text me-1"></i><strong>{{ 'INTEREST_REQUESTS.admin_note' | translate }}</strong> {{ interestRequest.admin_note }}
            </div>
          }
          @if (interestRequest.status === 'rejected' || interestRequest.status === 'revoked') {
            <button class="btn btn-sm btn-outline-primary mt-3" (click)="resetInterestForm()">
              <i class="bi bi-arrow-repeat me-1"></i>{{ 'INTEREST_REQUESTS.submit_another' | translate }}
            </button>
          }
        } @else {
          <!-- Interest request form -->
          <div class="row g-3">
            <div class="col-md-6">
              <div class="interest-panel__label">{{ 'INTEREST_REQUESTS.sector_field_label' | translate }} *</div>
              <app-searchable-select
                [ngModel]="interestForm.sector"
                (ngModelChange)="interestForm.sector = $event"
                [options]="industryOptions()"
                [placeholder]="'INTEREST_REQUESTS.sector_placeholder' | translate"
                [allowClear]="true">
              </app-searchable-select>
            </div>
            <div class="col-md-6">
              <div class="interest-panel__label">{{ 'INTEREST_REQUESTS.target_country_label' | translate }} *</div>
              <app-searchable-select
                [ngModel]="interestForm.country"
                (ngModelChange)="interestForm.country = $event"
                [options]="countryOptions()"
                [placeholder]="'INTEREST_REQUESTS.country_placeholder' | translate"
                [allowClear]="true">
              </app-searchable-select>
            </div>
            <div class="col-12">
              <div class="interest-panel__label">{{ 'INTEREST_REQUESTS.message_to_admin_label' | translate }} *</div>
              <textarea class="interest-panel__textarea" rows="4" [(ngModel)]="interestForm.message"
                [placeholder]="'INTEREST_REQUESTS.message_placeholder' | translate"
                maxlength="2000"></textarea>
              <div class="text-end small" style="color:var(--th-muted);">{{ interestForm.message.length }}/2000</div>
            </div>
            <div class="col-12">
              <button class="btn btn-primary btn-sm" (click)="submitInterestRequest()" [disabled]="submittingInterest">
                @if (submittingInterest) {
                  <span class="spinner-border spinner-border-sm me-1"></span>{{ 'COMMON.submitting' | translate }}
                } @else {
                  <i class="bi bi-send me-1"></i>{{ 'INTEREST_REQUESTS.submit_request' | translate }}
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
        <div class="loading-state__text">{{ 'COMMON.loading' | translate }}</div>
      </div>
    } @else if (error) {
      <div class="alert alert-danger">{{ error }}</div>
    } @else if (candidate) {
      <app-candidate-profile
        [candidate]="displayCandidate()"
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

  showReasonForm = false;
  requestReason = '';
  reasonTouched = false;
  isAgency = false;
  interestRequest: InterestRequest | null = null;
  interestForm = { sector: '', country: '', message: '' };
  submittingInterest = false;

  private candidateId = '';

  // ── Translation state ────────────────────────────────────────────────────────
  /** Whether this recruiter has the translation permission enabled */
  canTranslate = false;

  /** All available translation languages (excludes English — no point translating to source) */
  readonly translateLanguages: TranslateLanguage[] = TRANSLATE_LANGUAGES;

  /** Currently selected language code in the dropdown */
  selectedLangCode = 'fr';

  /** Controls the custom language dropdown open/closed state */
  translateDropdownOpen = signal(false);

  /** Translated candidate object — null means show original */
  private translatedCandidate = signal<Candidate | null>(null);

  /** Whether a translation API call is in progress */
  translating = signal(false);

  /** Whether the profile is currently showing a translation */
  translated = signal(false);

  /** The candidate object shown in the profile — translated version if active, else original */
  displayCandidate = computed<Candidate>(() =>
    this.translatedCandidate() ?? this.candidate!
  );

  /** Flag emoji of the currently selected translation language */
  activeLangFlag = computed<string>(() => {
    const lang = this.translateLanguages.find(l => l.code === this.selectedLangCode);
    return lang ? lang.flag : '🌐';
  });

  /** Label of the currently active translation language (shown in the badge and button) */
  activeLangLabel = computed<string>(() => {
    const lang = this.translateLanguages.find(l => l.code === this.selectedLangCode);
    return lang ? lang.label : '';
  });

  // ── Master data (inject before computed fields so this.master is available) ─
  private master = inject(MasterDataService);

  industryOptions = computed<SelectOption[]>(() =>
    this.master.industries().map((i: { name: string }) => ({ value: i.name, label: i.name }))
  );

  countryOptions = computed<SelectOption[]>(() =>
    this.master.countries().map((c: { name: string; flag_emoji: string }) => ({
      value: c.name,
      label: (c.flag_emoji ? c.flag_emoji + ' ' : '') + c.name,
    }))
  );

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private candidateService: CandidateService,
    private recruiterService: RecruiterService,
    private contactRequestService: ContactRequestService,
    private interestRequestService: InterestRequestService,
    private toast: ToastService,
    private translationService: CandidateTranslationService,
    private translate: TranslateService,
  ) {}

  backLink = '/recruiter/candidates';
  backLabel = 'CANDIDATE_PROFILE.back_to_candidates';

  ngOnInit(): void {
    this.master.loadAll();
    this.candidateId = this.route.snapshot.paramMap.get('id')!;

    const returnTo = this.route.snapshot.queryParamMap.get('returnTo');
    if (returnTo === 'shortlist') {
      this.backLink  = '/recruiter/shortlist';
      this.backLabel = 'CANDIDATE_PROFILE.back_to_shortlist';
    }

    forkJoin({
      profile:        this.candidateService.getById(this.candidateId).pipe(catchError(() => of(null))),
      shortlist:      this.recruiterService.getShortlist().pipe(catchError(() => of(null))),
      myRequests:     this.contactRequestService.getMyRequests().pipe(catchError(() => of(null))),
      myProfile:      this.recruiterService.getMyProfile().pipe(catchError(() => of(null))),
      myInterests:    this.interestRequestService.getMyRequests().pipe(catchError(() => of(null))),
    }).subscribe(({ profile, shortlist, myRequests, myProfile, myInterests }) => {
      this.loading = false;

      if (profile) {
        this.candidate     = profile.candidate;
        this.contactLocked = !!(profile.candidate as any).contact_locked;
      } else {
        this.error = 'Failed to load candidate profile.';
      }

      if (shortlist) {
        this.shortlisted = shortlist.shortlist.some((e: any) => e.candidate_id === this.candidateId);
      }

      if (myProfile) {
        this.isAgency    = (myProfile.recruiter as any).type === 'recruitment_agency';
        this.canTranslate = myProfile.recruiter.enable_translation === true;
      }

      if (!this.isAgency && myRequests) {
        const req = myRequests.requests.find((r: ContactRequest) => r.candidate_id === this.candidateId);
        if (req) {
          this.contactRequest       = req;
          this.contactRequestStatus = req.status;
        }
      }

      if (this.isAgency && myInterests) {
        const forCandidate = myInterests.requests.filter(
          (r: InterestRequest) => r.candidate_id === this.candidateId
        );
        const statusPriority: Record<string, number> = { pending: 0, approved: 1, revoked: 2, rejected: 3 };
        const ir = forCandidate.sort((a: InterestRequest, b: InterestRequest) => {
          const sp = (statusPriority[a.status] ?? 9) - (statusPriority[b.status] ?? 9);
          if (sp !== 0) return sp;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        })[0] ?? null;
        if (ir) this.interestRequest = ir;
      }
    });
  }

  // ── Translation actions ──────────────────────────────────────────────────────

  selectTranslateLang(code: string): void {
    this.selectedLangCode = code;
    this.translateDropdownOpen.set(false);
  }

  toggleTranslateDropdown(): void {
    this.translateDropdownOpen.update(v => !v);
  }

  @HostListener('document:click')
  onDocumentClick(): void { this.translateDropdownOpen.set(false); }

  @HostListener('document:keydown.escape')
  onEscape(): void { this.translateDropdownOpen.set(false); }

  translateProfile(): void {
    if (!this.candidate || this.translating()) return;

    const lang = this.translateLanguages.find(l => l.code === this.selectedLangCode);
    if (!lang) return;

    this.translating.set(true);

    this.translationService.translate(this.candidate, lang).subscribe({
      next: (translated) => {
        this.translatedCandidate.set(translated);
        this.translated.set(true);
        this.translating.set(false);
      },
      error: (err) => {
        this.translating.set(false);
        const msg = err?.error?.message ?? this.translate.instant('RECRUITER_CANDIDATES.translation_failed');
        this.toast.error(msg);
      },
    });
  }

  showOriginal(): void {
    this.translatedCandidate.set(null);
    this.translated.set(false);
  }

  // ── Contact / shortlist actions ──────────────────────────────────────────────

  requestContactInfo(): void {
    this.reasonTouched = true;
    if (!this.requestReason.trim()) return;
    this.requesting = true;
    this.contactRequestService.create(this.candidateId, this.requestReason.trim()).subscribe({
      next: (res) => {
        this.requesting           = false;
        this.showReasonForm       = false;
        this.requestReason        = '';
        this.reasonTouched        = false;
        this.contactRequest       = res.request;
        this.contactRequestStatus = 'pending';
        this.toast.success(this.translate.instant('CONTACT_STATUS.request_submitted'));
      },
      error: (err) => {
        this.requesting = false;
        this.toast.error(err?.error?.message ?? this.translate.instant('CONTACT_STATUS.request_submit_failed'));
      },
    });
  }

  submitInterestRequest(): void {
    const { sector, country, message } = this.interestForm;
    if (!sector.trim() || !country.trim() || message.trim().length < 10) {
      this.toast.error(this.translate.instant('RECRUITER_CANDIDATES.fill_all_fields'));
      return;
    }
    this.submittingInterest = true;
    this.interestRequestService.create({ candidate_id: this.candidateId, sector, country, message }).subscribe({
      next: (res) => {
        this.submittingInterest = false;
        this.interestRequest    = res.request;
        this.toast.success(this.translate.instant('RECRUITER_CANDIDATES.interest_review_submitted'));
      },
      error: (err) => {
        this.submittingInterest = false;
        this.toast.error(err?.error?.message ?? this.translate.instant('RECRUITER_CANDIDATES.interest_review_failed'));
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
        this.shortlisted  = true;
        this.toast.success(this.translate.instant('SHORTLIST.added_success', { name: `${this.candidate!.first_name} ${this.candidate!.last_name}` }));
      },
      error: (err) => {
        this.shortlisting = false;
        this.toast.error(err?.error?.message ?? this.translate.instant('SHORTLIST.add_failed'));
      },
    });
  }
}
