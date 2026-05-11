// src/app/features/admin/recruiter-list/recruiter-list.component.ts
import { Component, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormControl, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { catchError, of, distinctUntilChanged, skip } from 'rxjs';
import { RecruiterService } from '../../../core/services/recruiter.service';
import { MasterDataService } from '../../../core/services/master-data.service';
import { Recruiter } from '../../../core/models/recruiter.model';
import { RECRUITER_SORT_OPTIONS } from '../../../core/constants/candidate-options';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { RecruiterCardComponent } from '../../../shared/components/recruiter-card/recruiter-card.component';
import { SearchableSelectComponent, SelectOption } from '../../../shared/components/searchable-select/searchable-select.component';
import { ChipMultiSelectComponent, ChipOption } from '../../../shared/components/chip-multi-select/chip-multi-select.component';

// ── Password match validator ───────────────────────────────────────────────
function passwordsMatchValidator(g: AbstractControl): ValidationErrors | null {
  const pw  = g.get('new_password')?.value;
  const cpw = g.get('confirm_password')?.value;
  if (!pw) return null; // password optional — no match check if empty
  return pw === cpw ? null : { passwordsMismatch: true };
}

// ── Phone rules map ────────────────────────────────────────────────────────
interface PhoneRule { minLen: number; maxLen: number; pattern?: RegExp; hint: string; }
const PHONE_RULES: Record<string, PhoneRule> = {
  '+91':  { minLen: 10, maxLen: 10, pattern: /^[6-9]\d{9}$/,   hint: '10 digits starting with 6–9 (India)' },
  '+1':   { minLen: 10, maxLen: 10, pattern: /^\d{10}$/,        hint: '10 digits (US / Canada)' },
  '+44':  { minLen: 10, maxLen: 11, pattern: /^7\d{9}$/,        hint: '10 digits starting with 7 (UK mobile)' },
  '+61':  { minLen: 9,  maxLen: 9,  pattern: /^[4]\d{8}$/,      hint: '9 digits starting with 4 (Australia)' },
  '+971': { minLen: 9,  maxLen: 9,  pattern: /^[5]\d{8}$/,      hint: '9 digits starting with 5 (UAE)' },
  '+234': { minLen: 10, maxLen: 11, pattern: /^[7-9]\d{9,10}$/, hint: '10–11 digits starting with 7–9 (Nigeria)' },
  '+254': { minLen: 9,  maxLen: 9,  pattern: /^[7]\d{8}$/,      hint: '9 digits starting with 7 (Kenya)' },
  '+27':  { minLen: 9,  maxLen: 9,  pattern: /^[6-8]\d{8}$/,    hint: '9 digits starting with 6–8 (South Africa)' },
  '+49':  { minLen: 10, maxLen: 12, pattern: /^\d{10,12}$/,     hint: '10–12 digits (Germany)' },
  '+33':  { minLen: 9,  maxLen: 9,  pattern: /^[6-7]\d{8}$/,    hint: '9 digits starting with 6–7 (France)' },
};
const PHONE_FALLBACK: PhoneRule = { minLen: 5, maxLen: 15, pattern: /^\d{5,15}$/, hint: '5–15 digits' };

function getPhoneRule(dialCode: string): PhoneRule {
  return PHONE_RULES[dialCode] ?? PHONE_FALLBACK;
}

function makePhoneGroupValidator(dialCtrl: string, numCtrl: string): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const dial = group.get(dialCtrl)?.value as string || '';
    const num  = (group.get(numCtrl)?.value as string || '').replace(/\s+/g, '');
    const numControl = group.get(numCtrl);
    if (!numControl) return null;
    if (!num) {
      const cur = numControl.errors;
      if (cur?.['phoneInvalid']) {
        const { phoneInvalid: _, ...rest } = cur;
        numControl.setErrors(Object.keys(rest).length ? rest : null);
      }
      return null;
    }
    const rule = getPhoneRule(dial);
    const digitsOnly = /^\d+$/.test(num);
    const lenOk = num.length >= rule.minLen && num.length <= rule.maxLen;
    const patOk = rule.pattern ? rule.pattern.test(num) : true;
    if (!digitsOnly || !lenOk || !patOk) {
      const msg = `Invalid number for ${dial}. Expected: ${rule.hint}.`;
      numControl.setErrors({ ...(numControl.errors || {}), phoneInvalid: msg });
      return { phoneInvalid: true };
    }
    const cur = numControl.errors;
    if (cur?.['phoneInvalid']) {
      const { phoneInvalid: _, ...rest } = cur;
      numControl.setErrors(Object.keys(rest).length ? rest : null);
    }
    return null;
  };
}

function emailValidator(): ValidatorFn {
  return (ctrl: AbstractControl): ValidationErrors | null => {
    const v = (ctrl.value as string || '').trim();
    if (!v) return null;
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
    return ok ? null : { invalidEmail: true };
  };
}

function websiteValidator(): ValidatorFn {
  return (ctrl: AbstractControl): ValidationErrors | null => {
    const v = (ctrl.value as string || '').trim();
    if (!v) return null;
    const ok = /^(https?:\/\/)?(www\.)?[\w-]+(\.[\w-]{2,})(\/\S*)?$/.test(v);
    return ok ? null : { invalidWebsite: true };
  };
}

@Component({
  selector: 'app-recruiter-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, PageHeaderComponent, EmptyStateComponent, RecruiterCardComponent, SearchableSelectComponent, ChipMultiSelectComponent],
  template: `
    <!-- Header -->
    <app-page-header
      title="Recruiters"
      [subtitle]="pagination.total + ' total recruiters'"
      icon="bi-people"
    >
      <a routerLink="/admin/recruiters/create" class="btn btn-primary btn-sm">
        <i class="bi bi-person-plus me-1"></i>Add Recruiter
      </a>
    </app-page-header>

    <!-- ── Top bar ──────────────────────────────────────────────────────────── -->
    <div class="cfs-topbar mb-3">
      <div class="cfs-topbar__search">
        <i class="bi bi-search"></i>
        <input type="text" class="form-control form-control-sm"
          [formControl]="searchCtrl"
          placeholder="Search name, company, email…"
          (keydown.enter)="search()">
      </div>
      <div class="cfs-topbar__actions">
        <button type="button" class="filter-search-btn" (click)="search()">
          <i class="bi bi-search"></i> Search
        </button>
      <!-- Sort By -->
      <div class="cl-sort-wrap">
        <i class="bi bi-sort-down cl-sort-wrap__icon"></i>
        <app-searchable-select
          [formControl]="sortCtrl"
          [options]="RECRUITER_SORT_OPTIONS"
          [allowClear]="false"
          placeholder="Sort by…">
        </app-searchable-select>
      </div>
        <button type="button" class="cfs-toggle-sidebar-btn"
          [class.active]="advOpen"
          (click)="advOpen = !advOpen">
          <i class="bi bi-sliders2"></i>
          <span class="d-none d-sm-inline">Filters</span>
          @if (activeAdvCount > 0) {
            <span class="cfs-filter-badge">{{ activeAdvCount }}</span>
          }
        </button>
        <button type="button" class="cfs-export-btn"
          (click)="exportCsv()" [disabled]="exporting"
          title="Export filtered recruiters to CSV">
          @if (exporting) {
            <span class="spinner-border spinner-border-sm" role="status"></span>
          } @else {
            <i class="bi bi-download"></i>
          }
          <span class="d-none d-sm-inline ms-1">Export CSV</span>
        </button>
        <div class="cl-view-toggle">
          <button type="button" class="cl-view-toggle__btn"
            [class.cl-view-toggle__btn--active]="viewMode === 'list'"
            (click)="viewMode = 'list'" title="List view">
            <i class="bi bi-list-ul"></i>
          </button>
          <button type="button" class="cl-view-toggle__btn"
            [class.cl-view-toggle__btn--active]="viewMode === 'grid'"
            (click)="viewMode = 'grid'" title="Grid view">
            <i class="bi bi-grid-3x3-gap-fill"></i>
          </button>
        </div>
        @if (hasAnyFilter) {
          <button type="button" class="filter-clear-btn" (click)="clearFilters()">
            <i class="bi bi-x-lg"></i> Clear
          </button>
        }
      </div>
    </div>

    <!-- Advanced filters panel -->
    <div *ngIf="advOpen" class="filter-card mb-3">
      <form [formGroup]="filterForm" (ngSubmit)="search()">
        <div class="filter-card__advanced" [class.is-open]="advOpen">
          <div class="filter-card__advanced-inner">

            <!-- ── Company ─────────────────────────────────────────────── -->
            <p class="filter-card__group-label">Company</p>
            <div class="row g-2 mb-3">
              <div class="col-sm-6 col-md-4 col-lg-3">
                <label class="filter-card__section-label">Company Name</label>
                <input type="text" class="form-control form-control-sm"
                  formControlName="company" placeholder="e.g. Acme Corp">
              </div>
              <div class="col-sm-6 col-md-4 col-lg-3">
                <label class="filter-card__section-label">Company Country</label>
                <input type="text" class="form-control form-control-sm"
                  formControlName="companyCountry" placeholder="e.g. United Kingdom">
              </div>
              <div class="col-sm-6 col-md-4 col-lg-3">
                <label class="filter-card__section-label">Industry / Sector</label>
                <app-searchable-select
                  formControlName="industry"
                  [options]="INDUSTRY_SELECT_OPTS"
                  placeholder="All Industries"
                  [allowClear]="true">
                </app-searchable-select>
              </div>
            </div>

            <!-- ── Sponsor Licence ─────────────────────────────────────── -->
            <p class="filter-card__group-label">Sponsor Licence</p>
            <div class="row g-2 mb-3">
              <div class="col-sm-6 col-md-4 col-lg-3">
                <label class="filter-card__section-label">Holds Sponsor Licence</label>
                <app-searchable-select
                  formControlName="hasSponsorLicence"
                  [options]="LICENCE_OPTS"
                  placeholder="Any"
                  [allowClear]="true">
                </app-searchable-select>
              </div>
              <div class="col-sm-6 col-md-4 col-lg-3">
                <label class="filter-card__section-label">Sponsor Licence Country</label>
                <app-searchable-select
                  formControlName="sponsorCountry"
                  [options]="SPONSOR_COUNTRY_OPTS"
                  placeholder="Any Country"
                  [allowClear]="true">
                </app-searchable-select>
              </div>
            </div>

            <!-- ── Status & Activity ───────────────────────────────────── -->
            <p class="filter-card__group-label">Status &amp; Activity</p>
            <div class="row g-2 mb-3">
              <div class="col-sm-6 col-md-4 col-lg-3">
                <label class="filter-card__section-label">Account Status</label>
                <app-searchable-select
                  formControlName="accountStatus"
                  [options]="ACCOUNT_STATUS_OPTS"
                  placeholder="All Statuses"
                  [allowClear]="true">
                </app-searchable-select>
              </div>
              <div class="col-sm-6 col-md-4 col-lg-3">
                <label class="filter-card__section-label">Last Active</label>
                <app-searchable-select
                  formControlName="lastActive"
                  [options]="LAST_ACTIVE_OPTS"
                  placeholder="Any Time"
                  [allowClear]="true">
                </app-searchable-select>
              </div>
              <div class="col-sm-6 col-md-4 col-lg-3">
                <label class="filter-card__section-label">Date Joined — From</label>
                <input type="date" class="form-control form-control-sm"
                  formControlName="joinedFrom">
              </div>
              <div class="col-sm-6 col-md-4 col-lg-3">
                <label class="filter-card__section-label">Date Joined — To</label>
                <input type="date" class="form-control form-control-sm"
                  formControlName="joinedTo">
              </div>
            </div>

            <div class="d-flex gap-2">
              <button type="submit" class="filter-search-btn">
                <i class="bi bi-search"></i> Apply Filters
              </button>
              @if (hasAnyFilter) {
                <button type="button" class="filter-clear-btn" (click)="clearFilters()">
                  <i class="bi bi-x-lg"></i> Clear All
                </button>
              }
            </div>

          </div>
        </div>
      </form>
    </div>

    <!-- ── Bulk Action Bar ─────────────────────────────────────────────────── -->
    @if (selectionCount > 0) {
      <div class="cl-bulk-bar mb-3">
        <span class="cl-bulk-bar__count">
          <i class="bi bi-check2-square me-1"></i>
          {{ selectionCount }} recruiter{{ selectionCount === 1 ? '' : 's' }} selected
        </span>
        <div class="cl-bulk-bar__actions">
          <button type="button" class="btn btn-sm btn-outline-secondary"
            (click)="bulkExportCsv()" [disabled]="bulkProcessing"
            title="Export selected to CSV">
            <i class="bi bi-download me-1"></i>Export
          </button>
          <button type="button" class="btn btn-sm btn-success"
            (click)="bulkActivate()" [disabled]="bulkProcessing">
            <i class="bi bi-check-circle me-1"></i>Activate
          </button>
          <button type="button" class="btn btn-sm btn-warning"
            (click)="bulkDeactivate()" [disabled]="bulkProcessing">
            <i class="bi bi-pause-circle me-1"></i>Deactivate
          </button>
          <button type="button" class="btn btn-sm btn-link text-muted"
            (click)="clearSelection()">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
      </div>
    }

    <!-- Results -->
    @if (loading) {
      <div class="loading-state">
        <div class="spinner-border"></div>
        <div class="loading-state__text">Loading recruiters…</div>
      </div>
    } @else if (recruiters.length === 0) {
      <app-empty-state
        icon="bi-people"
        title="No recruiters yet"
        subtitle="Get started by adding your first recruiter."
        actionLabel="Add your first recruiter"
        actionRoute="/admin/recruiters/create"
      />
    } @else {

      <!-- ══ LIST VIEW ══ -->
      @if (viewMode === 'list') {
        <div class="section-card">
          <div class="table-responsive">
            <table class="table table-hover align-middle mb-0">
              <thead class="table-light">
                <tr>
                  <th style="width:36px">
                    <input type="checkbox" class="form-check-input"
                      [checked]="isAllSelected()"
                      [indeterminate]="isIndeterminate()"
                      (change)="toggleSelectAll()">
                  </th>
                   <th class="small">#</th>
                   <th class="small">Name</th>
                   <th class="small">Type</th>
                   <th class="small">Company</th>
                  <th class="small">Email</th>
                  <th class="small">Expires</th>
                  <th class="small">Status</th>
                  <th class="small">Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (rec of recruiters; track rec.id) {
                  <tr [class.table-active]="isSelected(rec.id)">
                    <td>
                      <input type="checkbox" class="form-check-input"
                        [checked]="isSelected(rec.id)"
                        (change)="toggleSelect(rec.id)"
                        (click)="$event.stopPropagation()">
                    </td>
                    <td>
                      @if (rec.recruiter_number) {
                        <span class="autocode-badge">{{ rec.recruiter_number }}</span>
                      }
                    </td>
                     <td class="fw-semibold small">{{ rec.contact_name }}</td>
                     <td>
                       <span class="rc-badge rc-badge--sm"
                         [class.rc-badge--type-employer]="rec.type !== 'recruitment_agency'"
                         [class.rc-badge--type-agency]="rec.type === 'recruitment_agency'">
                         {{ rec.type === 'recruitment_agency' ? 'Recruitment Agency' : 'Direct Employer' }}
                       </span>
                     </td>
                     <td class="small text-muted">{{ rec.company_name || '—' }}</td>
                    <td class="small">{{ rec.email }}</td>
                    <td class="small">
                      <span [class.text-danger]="isExpired(rec.access_expires_at)"
                            [class.text-muted]="!isExpired(rec.access_expires_at)">
                        {{ rec.access_expires_at | date:'dd MMM yyyy' }}
                        @if (isExpired(rec.access_expires_at)) {
                          <span class="badge bg-danger ms-1">Expired</span>
                        }
                      </span>
                    </td>
                    <td>
                      <span class="badge rounded-pill"
                        [class.bg-success]="rec.is_active"
                        [class.bg-secondary]="!rec.is_active">
                        {{ rec.is_active ? 'Active' : 'Inactive' }}
                      </span>
                    </td>
                    <td>
                      <div class="tbl-actions">
                        <a [routerLink]="['/admin/recruiters', rec.id]"
                          class="tbl-actions__btn tbl-actions__btn--view tbl-actions__btn--icon"
                          title="View recruiter">
                          <i class="bi bi-eye"></i>
                        </a>
                        <button class="tbl-actions__btn tbl-actions__btn--edit tbl-actions__btn--icon"
                          (click)="openEdit(rec)" title="Edit recruiter">
                          <i class="bi bi-pencil"></i>
                        </button>
                        <div class="tbl-actions__sep"></div>
                        <button class="tbl-actions__btn tbl-actions__btn--token"
                          (click)="resendCredentials(rec)"
                          title="Resend login credentials">
                          <i class="bi bi-envelope"></i>
                          Resend
                        </button>
                        <div class="tbl-actions__sep"></div>
                        <button class="tbl-actions__btn tbl-actions__btn--danger tbl-actions__btn--icon"
                          (click)="deleteRecruiter(rec)" title="Delete recruiter">
                          <i class="bi bi-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      <!-- ══ GRID VIEW ══ -->
      @if (viewMode === 'grid') {
        <div class="rc-grid">
          @for (rec of recruiters; track rec.id) {
            <div style="position:relative">
              <div style="position:absolute;top:10px;left:10px;z-index:10">
                <input type="checkbox" class="form-check-input"
                  [checked]="isSelected(rec.id)"
                  (change)="toggleSelect(rec.id)"
                  (click)="$event.stopPropagation()">
              </div>
              <app-recruiter-card
                [recruiter]="rec"
                (edit)="openEdit(rec)"
                (delete)="deleteRecruiter(rec)"
                (resendCreds)="resendCredentials(rec)"
                (toggleActive)="toggleActive(rec)">
              </app-recruiter-card>
            </div>
          }
        </div>
      }

      <!-- Pagination (shared) -->
      @if (pagination.pages > 1) {
        <nav class="mt-3 d-flex justify-content-center">
          <ul class="pagination pagination-sm mb-0">
            <li class="page-item" [class.disabled]="pagination.page === 1">
              <button class="page-link" (click)="goToPage(pagination.page - 1)">«</button>
            </li>
            @for (pg of pageNumbers(); track pg) {
              <li class="page-item" [class.active]="pg === pagination.page">
                <button class="page-link" (click)="goToPage(pg)">{{ pg }}</button>
              </li>
            }
            <li class="page-item" [class.disabled]="pagination.page === pagination.pages">
              <button class="page-link" (click)="goToPage(pagination.page + 1)">»</button>
            </li>
          </ul>
        </nav>
      }
    }

    <!-- ═══════════════════════════════════════════════════════════════════════
         Edit Recruiter — Bootstrap Modal
    ═══════════════════════════════════════════════════════════════════════════ -->
    @if (editingRecruiter && editForm) {
      <!-- Backdrop -->
      <div class="modal-backdrop fade show" style="z-index:1050"></div>

      <!-- Modal -->
      <div class="modal fade show d-block" tabindex="-1" style="z-index:1055" role="dialog"
        aria-labelledby="editRecruiterModalLabel" aria-modal="true">
        <div class="modal-dialog modal-xl modal-dialog-scrollable">
          <div class="modal-content">

            <!-- ── Modal Header ── -->
            <div class="modal-header">
              <div class="d-flex align-items-center gap-3">
                <div class="rec-edit-panel__avatar">
                  {{ editingRecruiter.contact_name.charAt(0).toUpperCase() }}
                </div>
                <div>
                  <h5 class="modal-title mb-0" id="editRecruiterModalLabel">Edit Recruiter</h5>
                  <div class="text-muted small">{{ editingRecruiter.contact_name }}</div>
                </div>
              </div>
              <button type="button" class="btn-close" (click)="closeEdit()" aria-label="Close"></button>
            </div>

            <!-- ── Modal Body ── -->
            <div class="modal-body">
              <form [formGroup]="editForm" (ngSubmit)="saveEdit()" id="editRecruiterForm">

                <!-- ══ Section 1: Contact Person Details ══ -->
                <h6 class="form-section-heading">
                  <i class="bi bi-person-vcard me-2"></i>Contact Person Details
                </h6>
                <div class="row g-3 mb-4">

                  <div class="col-md-6">
                    <label class="form-label fw-semibold">Full Name <span class="text-danger">*</span></label>
                    <input formControlName="contact_name" class="form-control"
                      [class.is-invalid]="editInvalid('contact_name')" placeholder="Jane Smith">
                    @if (editInvalid('contact_name')) {
                      @if (editCtrl('contact_name').hasError('required')) {
                        <div class="invalid-feedback">Full name is required.</div>
                      } @else if (editCtrl('contact_name').hasError('minlength')) {
                        <div class="invalid-feedback">Name must be at least 3 characters.</div>
                      } @else if (editCtrl('contact_name').hasError('maxlength')) {
                        <div class="invalid-feedback">Name must be 100 characters or fewer.</div>
                      } @else if (editCtrl('contact_name').hasError('pattern')) {
                        <div class="invalid-feedback">Name may only contain letters, spaces, hyphens, apostrophes and dots.</div>
                      }
                    }
                  </div>

                  <div class="col-md-6">
                    <label class="form-label fw-semibold">Recruiter Type</label>
                    <app-searchable-select
                      formControlName="type"
                      [options]="RECRUITER_TYPE_OPTS"
                      [allowClear]="false"
                      placeholder="Select type" />
                  </div>

                  <div class="col-md-6">
                    <label class="form-label fw-semibold">Job Title / Role</label>
                    <input formControlName="contact_job_title" class="form-control"
                      [class.is-invalid]="editInvalid('contact_job_title')"
                      placeholder="e.g. HR Manager, Director, Owner">
                    @if (editInvalid('contact_job_title')) {
                      @if (editCtrl('contact_job_title').hasError('minlength')) {
                        <div class="invalid-feedback">Job title must be at least 2 characters.</div>
                      } @else if (editCtrl('contact_job_title').hasError('maxlength')) {
                        <div class="invalid-feedback">Job title must be 100 characters or fewer.</div>
                      }
                    }
                  </div>

                  <div class="col-md-6">
                    <label class="form-label fw-semibold">Work Email <span class="text-danger">*</span></label>
                    <input formControlName="email" type="email" class="form-control"
                      [class.is-invalid]="editInvalid('email')" placeholder="recruiter@company.com">
                    @if (editInvalid('email')) {
                      @if (editCtrl('email').hasError('required')) {
                        <div class="invalid-feedback">Work email is required.</div>
                      } @else if (editCtrl('email').hasError('invalidEmail')) {
                        <div class="invalid-feedback">Please enter a valid email address.</div>
                      }
                    }
                  </div>

                  <!-- Phone -->
                  <div class="col-md-6">
                    <label class="form-label fw-semibold">Phone Number <span class="text-danger">*</span></label>
                    <div class="phone-input-group">
                      <app-searchable-select
                        formControlName="phone_dial_code"
                        [options]="dialCodeOptions()"
                        [allowClear]="false"
                        placeholder="🌐"
                        class="dial-select" />
                      <input type="tel" class="form-control phone-number-input"
                        formControlName="phone_number"
                        placeholder="7700 900000"
                        [class.is-invalid]="editInvalid('phone_number') || (editSubmitted && editCtrl('phone_number').hasError('phoneInvalid'))">
                    </div>
                    @if (editCtrl('phone_number').touched && editCtrl('phone_number').errors) {
                      <div class="text-danger small mt-1">
                        @if (editCtrl('phone_number').errors?.['required']) { Phone number is required. }
                        @else if (editCtrl('phone_number').errors?.['phoneInvalid']) { {{ editCtrl('phone_number').errors?.['phoneInvalid'] }} }
                      </div>
                    }
                  </div>

                  <!-- WhatsApp -->
                  <div class="col-md-6">
                    <label class="form-label fw-semibold">WhatsApp Number <span class="text-danger">*</span></label>
                    <div class="phone-input-group">
                      <app-searchable-select
                        formControlName="whatsapp_dial_code"
                        [options]="dialCodeOptions()"
                        [allowClear]="false"
                        placeholder="🌐"
                        class="dial-select"
                        [class.bg-light]="editForm.get('whatsapp_same_as_phone')?.value" />
                      <input type="tel" class="form-control phone-number-input"
                        formControlName="whatsapp_number"
                        placeholder="7700 900000"
                        [class.bg-light]="editForm.get('whatsapp_same_as_phone')?.value"
                        [class.is-invalid]="editInvalid('whatsapp_number') || (editSubmitted && editCtrl('whatsapp_number').hasError('phoneInvalid'))"
                        [attr.readonly]="editForm.get('whatsapp_same_as_phone')?.value ? true : null">
                    </div>
                    <div class="form-check mt-1">
                      <input class="form-check-input" type="checkbox"
                        formControlName="whatsapp_same_as_phone" id="editWaSameAsPhone">
                      <label class="form-check-label small text-muted" for="editWaSameAsPhone">
                        Same as phone number
                      </label>
                    </div>
                    @if (editCtrl('whatsapp_number').touched && editCtrl('whatsapp_number').errors) {
                      <div class="text-danger small mt-1">
                        @if (editCtrl('whatsapp_number').errors?.['required']) { WhatsApp number is required. }
                        @else if (editCtrl('whatsapp_number').errors?.['phoneInvalid']) { {{ editCtrl('whatsapp_number').errors?.['phoneInvalid'] }} }
                      </div>
                    }
                  </div>

                </div>

                <!-- ══ Section 2: Company Details ══ -->
                <h6 class="form-section-heading">
                  <i class="bi bi-building me-2"></i>Company Details
                </h6>
                <div class="row g-3 mb-4">

                  <div class="col-md-6">
                    <label class="form-label fw-semibold">Company Name</label>
                    <input formControlName="company_name" class="form-control"
                      [class.is-invalid]="editInvalid('company_name')" placeholder="Acme Recruiting Ltd">
                    @if (editInvalid('company_name')) {
                      @if (editCtrl('company_name').hasError('minlength')) {
                        <div class="text-danger mt-1" style="font-size:.875em">Company name must be at least 2 characters.</div>
                      } @else if (editCtrl('company_name').hasError('maxlength')) {
                        <div class="text-danger mt-1" style="font-size:.875em">Company name must be 150 characters or fewer.</div>
                      }
                    }
                  </div>

                  <div class="col-md-6">
                    <label class="form-label fw-semibold">Company Website</label>
                    <div class="input-group">
                      <span class="input-group-text"><i class="bi bi-globe"></i></span>
                      <input formControlName="company_website" class="form-control"
                        [class.is-invalid]="editInvalid('company_website')" placeholder="https://example.com">
                      @if (editInvalid('company_website')) {
                        <div class="invalid-feedback">Please enter a valid URL (e.g. https://example.com or www.example.com).</div>
                      }
                    </div>
                  </div>

                  <div class="col-md-6">
                    <label class="form-label fw-semibold">Company Country</label>
                    <app-searchable-select
                      formControlName="company_country"
                      [options]="countryOpts()"
                      placeholder="Select country" />
                  </div>

                  <div class="col-md-6">
                    <label class="form-label fw-semibold">Company City</label>
                    <app-searchable-select
                      formControlName="company_city"
                      [options]="editCityOpts()"
                      placeholder="Select city" />
                    <div class="form-text">Select a country first to load cities.</div>
                  </div>

                  <div class="col-md-6">
                    <label class="form-label fw-semibold">Industry / Sector</label>
                    <app-searchable-select
                      formControlName="industry"
                      [options]="EDIT_INDUSTRY_OPTS"
                      [allowClear]="true"
                      placeholder="— Select industry —" />
                  </div>

                  <div class="col-md-6">
                    <label class="form-label fw-semibold">Company Size</label>
                    <app-searchable-select
                      formControlName="company_size"
                      [options]="COMPANY_SIZE_OPTS"
                      [allowClear]="true"
                      placeholder="— Select size —" />
                  </div>

                </div>

                <!-- ══ Section 3: Recruitment Agency Details (conditional) ══ -->
                @if (editIsAgency) {
                  <h6 class="form-section-heading">
                    <i class="bi bi-diagram-3 me-2"></i>Recruitment Agency Details
                  </h6>
                  <div class="row g-3 mb-4">
                    <div class="col-12">
                      <label class="form-label fw-semibold">Sectors They Recruit For</label>
                      <app-chip-multi-select formControlName="sectors_recruit_for"
                        [options]="industryChipOpts()" placeholder="Select sectors" />
                    </div>
                    <div class="col-12">
                      <label class="form-label fw-semibold">Countries They Place In</label>
                      <app-chip-multi-select formControlName="countries_place_in"
                        [options]="nationalityOpts()" placeholder="Select countries" />
                    </div>
                  </div>
                }

                <!-- ══ Section 4: Sponsor Licence ══ -->
                <h6 class="form-section-heading">
                  <i class="bi bi-shield-check me-2"></i>Sponsor Licence Details
                  <span class="badge bg-danger ms-2" style="font-size:.65rem;font-weight:600;letter-spacing:.04em">CRITICAL</span>
                </h6>
                <div class="row g-3 mb-4">

                  <div class="col-md-6">
                    <label class="form-label fw-semibold">Holds Sponsor Licence</label>
                    <app-searchable-select
                      formControlName="has_sponsor_licence"
                      [options]="SPONSOR_LICENCE_EDIT_OPTS"
                      [allowClear]="true"
                      placeholder="— Select —" />
                  </div>

                  @if (editSponsorYes) {
                    <div class="col-md-6">
                      <label class="form-label fw-semibold">Licence Number <span class="text-danger">*</span></label>
                      <input formControlName="sponsor_licence_number" class="form-control"
                        [class.is-invalid]="editInvalid('sponsor_licence_number')"
                        placeholder="e.g. 1Z3GF3C...">
                      @if (editInvalid('sponsor_licence_number')) {
                        @if (editCtrl('sponsor_licence_number').hasError('required')) {
                          <div class="text-danger mt-1" style="font-size:.875em">Licence number is required.</div>
                        } @else if (editCtrl('sponsor_licence_number').hasError('minlength')) {
                          <div class="text-danger mt-1" style="font-size:.875em">Licence number must be at least 3 characters.</div>
                        } @else if (editCtrl('sponsor_licence_number').hasError('maxlength')) {
                          <div class="text-danger mt-1" style="font-size:.875em">Licence number must be 100 characters or fewer.</div>
                        }
                      }
                      <div class="form-text">Verifiable at gov.uk</div>
                    </div>

                    <div class="col-12">
                      <label class="form-label fw-semibold">Sponsor Licence Countries</label>
                      <app-chip-multi-select formControlName="sponsor_licence_countries"
                        [options]="sponsorCountryChipOpts" placeholder="Select countries covered by licence" />
                    </div>

                    <div class="col-md-6">
                      <label class="form-label fw-semibold">Licence Rating</label>
                      <app-searchable-select
                        formControlName="licence_rating"
                        [options]="LICENCE_RATING_OPTS"
                        [allowClear]="true"
                        placeholder="— Select rating —" />
                      @if (editLicenceRatingA) {
                        <div class="form-text text-success fw-semibold">
                          <i class="bi bi-check-circle-fill me-1"></i>A-Rating — valid for approvals
                        </div>
                      }
                      @if (editLicenceRatingB) {
                        <div class="form-text text-warning fw-semibold">
                          <i class="bi bi-exclamation-triangle-fill me-1"></i>B-Rating — not valid for approvals
                        </div>
                      }
                    </div>

                    <div class="col-md-6">
                      <label class="form-label fw-semibold d-block">Licence Verified by Admin</label>
                      <div class="d-flex align-items-center gap-3 mt-1">
                        <div class="form-check form-switch mb-0">
                          <input class="form-check-input" type="checkbox" role="switch"
                            formControlName="licence_verified" id="editLicenceVerifiedToggle"
                            style="width:2.5rem;height:1.25rem">
                          <label class="form-check-label ms-2 fw-semibold" for="editLicenceVerifiedToggle"
                            [style.color]="editForm.get('licence_verified')?.value ? 'var(--bs-success)' : 'var(--bs-warning)'">
                            {{ editForm.get('licence_verified')?.value ? 'Verified' : 'Not Verified' }}
                          </label>
                        </div>
                        @if (editForm.get('licence_verified')?.value) {
                          <i class="bi bi-patch-check-fill text-success"></i>
                        }
                      </div>
                      <div class="form-text">Admin confirms after gov.uk verification.</div>
                    </div>
                  }

                </div>

                <!-- ══ Section 5: Hiring Preferences ══ -->
                <h6 class="form-section-heading">
                  <i class="bi bi-people me-2"></i>Hiring Preferences
                </h6>
                <div class="row g-3 mb-4">
                  <div class="col-12">
                    <label class="form-label fw-semibold">Which Nationalities Looking to Hire</label>
                    <app-chip-multi-select formControlName="target_nationalities"
                      [options]="nationalityOpts()" placeholder="Select nationalities to hire" />
                  </div>
                  <div class="col-12">
                    <label class="form-label fw-semibold">Target Candidate Countries</label>
                    <app-chip-multi-select formControlName="countries_place_in"
                      [options]="nationalityOpts()" placeholder="Where they want candidates from" />
                  </div>
                  <div class="col-12">
                    <label class="form-label fw-semibold">Sectors Hiring For</label>
                    <app-chip-multi-select formControlName="sectors_recruit_for"
                      [options]="industryChipOpts()" placeholder="Select sectors" />
                  </div>
                  <div class="col-md-6">
                    <label class="form-label fw-semibold">Typical Hires Per Year</label>
                    <app-searchable-select
                      formControlName="hires_per_year"
                      [options]="HIRES_PER_YEAR_OPTS"
                      [allowClear]="true"
                      placeholder="— Select —" />
                  </div>
                  <div class="col-md-6">
                    <label class="form-label fw-semibold">Job Types Offered</label>
                    <app-chip-multi-select formControlName="job_types"
                      [options]="jobTypeChipOpts" placeholder="Select job types" />
                  </div>
                </div>

                <!-- ══ Section 6: Access & Account Settings ══ -->
                <h6 class="form-section-heading">
                  <i class="bi bi-gear me-2"></i>Access &amp; Account Settings
                </h6>
                <div class="row g-3 mb-4">

                  <div class="col-md-6">
                    <label class="form-label fw-semibold">Account Status</label>
                    <app-searchable-select
                      formControlName="is_active_str"
                      [options]="ACCOUNT_STATUS_EDIT_OPTS"
                      [allowClear]="false"
                      placeholder="Select status" />
                  </div>

                  <div class="col-12">
                    <label class="form-label fw-semibold">
                      Extend Access Duration
                      <span class="text-muted fw-normal small ms-1">— leave blank to keep current</span>
                    </label>
                    <div class="d-flex gap-2">
                      <input type="number" formControlName="duration_value" class="form-control"
                        placeholder="e.g. 6" min="1" style="width:110px;flex-shrink:0">
                      <div style="min-width:140px;flex-shrink:0">
                        <app-searchable-select
                          formControlName="duration_unit"
                          [options]="DURATION_UNIT_OPTS"
                          [allowClear]="false"
                          placeholder="— Unit —" />
                      </div>
                    </div>
                    @if (expiryPreview) {
                      <div class="form-text text-info mt-1">
                        <i class="bi bi-calendar-check me-1"></i>New expiry: <strong>{{ expiryPreview }}</strong>
                      </div>
                    } @else if (editingRecruiter.access_expires_at) {
                      <div class="form-text mt-1"
                        [class.text-danger]="isExpired(editingRecruiter.access_expires_at)">
                        <i class="bi bi-calendar{{ isExpired(editingRecruiter.access_expires_at) ? '-x' : '2' }} me-1"></i>
                        Current expiry: <strong>{{ editingRecruiter.access_expires_at | date:'dd MMM yyyy, HH:mm' }}</strong>
                        @if (isExpired(editingRecruiter.access_expires_at)) {
                          <span class="badge bg-danger ms-1" style="font-size:.65rem">Expired</span>
                        }
                      </div>
                    }
                  </div>

                  <div class="col-md-6">
                    <label class="form-label fw-semibold d-block">Free Account</label>
                    <div class="d-flex align-items-center gap-3 mt-1">
                      <div class="form-check form-switch mb-0">
                        <input class="form-check-input" type="checkbox" role="switch"
                          formControlName="free_account" id="editFreeAccountToggle"
                          style="width:2.5rem;height:1.25rem">
                        <label class="form-check-label ms-2 fw-semibold" for="editFreeAccountToggle"
                          [style.color]="editForm.get('free_account')?.value ? 'var(--bs-success)' : 'var(--bs-secondary)'">
                          {{ editForm.get('free_account')?.value ? 'Free Account' : 'Paid Account' }}
                        </label>
                      </div>
                    </div>
                  </div>

                </div>

                <!-- ══ Section 7: Credentials ══ -->
                <h6 class="form-section-heading">
                  <i class="bi bi-shield-lock me-2"></i>Credentials
                </h6>
                <div class="row g-3 mb-4">

                  <!-- Current password read-only -->
                  <div class="col-md-6">
                    <label class="form-label fw-semibold">Current Password</label>
                    <div class="input-group">
                      <input [type]="showCurrentPw ? 'text' : 'password'"
                        class="form-control"
                        [value]="editingRecruiter.plain_password ?? ''" readonly>
                      <button type="button" class="btn btn-outline-secondary"
                        (click)="showCurrentPw = !showCurrentPw"
                        [attr.aria-label]="showCurrentPw ? 'Hide password' : 'Show password'">
                        <i class="bi" [class.bi-eye]="!showCurrentPw" [class.bi-eye-slash]="showCurrentPw"></i>
                      </button>
                    </div>
                  </div>

                  <!-- New password -->
                  <div class="col-md-6">
                    <label class="form-label fw-semibold">
                      New Password
                      <span class="text-muted fw-normal small ms-1">— optional</span>
                    </label>
                    <div class="input-group">
                      <input [type]="showNewPw ? 'text' : 'password'" formControlName="new_password"
                        class="form-control"
                        placeholder="Min 8 chars, upper + lower + number"
                        [class.is-invalid]="editCtrl('new_password').invalid && editCtrl('new_password').touched">
                      <button type="button" class="btn btn-outline-secondary"
                        (click)="showNewPw = !showNewPw"
                        [attr.aria-label]="showNewPw ? 'Hide password' : 'Show password'">
                        <i class="bi" [class.bi-eye]="!showNewPw" [class.bi-eye-slash]="showNewPw"></i>
                      </button>
                    </div>
                    @if (editCtrl('new_password').touched) {
                      @if (editCtrl('new_password').errors?.['minlength']) {
                        <div class="text-danger mt-1" style="font-size:.875em">Minimum 8 characters required.</div>
                      } @else if (editCtrl('new_password').errors?.['pattern']) {
                        <div class="text-danger mt-1" style="font-size:.875em">Must include uppercase, lowercase, and a number.</div>
                      }
                    }
                  </div>

                  <!-- Confirm new password -->
                  <div class="col-md-6">
                    <label class="form-label fw-semibold">Confirm New Password</label>
                    <div class="input-group">
                      <input [type]="showConfirmPw ? 'text' : 'password'" formControlName="confirm_password"
                        class="form-control"
                        placeholder="Repeat new password"
                        [class.is-invalid]="editForm.hasError('passwordsMismatch') && editCtrl('confirm_password').touched">
                      <button type="button" class="btn btn-outline-secondary"
                        (click)="showConfirmPw = !showConfirmPw"
                        [attr.aria-label]="showConfirmPw ? 'Hide' : 'Show'">
                        <i class="bi" [class.bi-eye]="!showConfirmPw" [class.bi-eye-slash]="showConfirmPw"></i>
                      </button>
                    </div>
                    @if (editForm.hasError('passwordsMismatch') && editCtrl('confirm_password').touched) {
                      <div class="text-danger mt-1" style="font-size:.875em">Passwords do not match.</div>
                    }
                  </div>

                </div>

                <!-- ══ Section 8: Admin Notes ══ -->
                <h6 class="form-section-heading">
                  <i class="bi bi-journal-text me-2"></i>Admin Notes
                </h6>
                <div class="mb-4">
                  <textarea formControlName="admin_notes" class="form-control" rows="3"
                    placeholder="Internal notes — not visible to the recruiter"></textarea>
                </div>

                <!-- Error alert -->
                @if (editError) {
                  <div class="alert alert-danger small py-2 mb-3">
                    <i class="bi bi-exclamation-triangle me-1"></i>{{ editError }}
                  </div>
                }

              </form>
            </div>

            <!-- ── Modal Footer ── -->
            <div class="modal-footer">
              <button type="button" class="btn btn-outline-secondary" (click)="closeEdit()">
                Cancel
              </button>
              <button type="submit" form="editRecruiterForm" class="btn btn-primary" [disabled]="editSaving">
                @if (editSaving) {
                  <span class="spinner-border spinner-border-sm me-1"></span> Saving…
                } @else {
                  <i class="bi bi-check-lg me-1"></i> Save Changes
                }
              </button>
            </div>

          </div>
        </div>
      </div>
    }
  `,
})
export class RecruiterListComponent implements OnInit {
  readonly RECRUITER_SORT_OPTIONS: SelectOption[] = RECRUITER_SORT_OPTIONS;

  // ── Computed signals ────────────────────────────────────────────────────────
  countryOpts = computed<SelectOption[]>(() =>
    this.master.countries().map(c => ({ value: c.name, label: `${c.flag_emoji} ${c.name}` }))
  );
  industryOpts = computed<SelectOption[]>(() =>
    this.master.industries().map(i => ({ value: i.name, label: i.name }))
  );
  industryChipOpts = computed<ChipOption[]>(() =>
    this.master.industries().map(i => ({ value: i.name, label: i.name }))
  );
  nationalityOpts = computed<ChipOption[]>(() =>
    this.master.countries().map(c => ({ value: c.name, label: `${c.flag_emoji} ${c.name}` }))
  );
  dialCodeOptions = computed<SelectOption[]>(() =>
    this.master.countries().map(c => ({
      value: c.dial_code,
      label: `${c.flag_emoji} ${c.dial_code}`,
      sublabel: c.name,
    }))
  );
  editCityOpts = computed<SelectOption[]>(() =>
    this.master.cities().map(c => ({ value: c.name, label: c.name }))
  );

  // ── Filter SelectOption[] arrays ────────────────────────────────────────────
  readonly INDUSTRY_SELECT_OPTS: SelectOption[] = [
    'Healthcare', 'IT', 'Engineering', 'Finance',
    'Care', 'Education', 'Hospitality', 'Construction',
  ].map(v => ({ value: v, label: v }));

  readonly SPONSOR_COUNTRY_OPTS: SelectOption[] = [
    'United Kingdom', 'Germany', 'Netherlands', 'Canada', 'Australia',
    'United States', 'France', 'Ireland', 'New Zealand', 'Singapore',
  ].map(v => ({ value: v, label: v }));

  readonly LICENCE_OPTS: SelectOption[] = [
    { value: 'yes',     label: 'Yes' },
    { value: 'no',      label: 'No' },
    { value: 'unknown', label: 'Unknown' },
  ];

  readonly ACCOUNT_STATUS_OPTS: SelectOption[] = [
    { value: 'active',   label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'expired',  label: 'Expired Access' },
  ];

  readonly LAST_ACTIVE_OPTS: SelectOption[] = [
    { value: '7_days',  label: 'Within 7 days' },
    { value: '30_days', label: 'Within 30 days' },
    { value: '90_days', label: 'Within 90 days' },
  ];

  // ── Edit modal static option arrays ────────────────────────────────────────
  readonly RECRUITER_TYPE_OPTS: SelectOption[] = [
    { value: 'direct_employer',    label: 'Direct Employer' },
    { value: 'recruitment_agency', label: 'Recruitment Agency' },
  ];

  readonly EDIT_INDUSTRY_OPTS: SelectOption[] = [
    { value: 'Healthcare',   label: 'Healthcare' },
    { value: 'IT',           label: 'IT' },
    { value: 'Engineering',  label: 'Engineering' },
    { value: 'Care',         label: 'Care' },
    { value: 'Education',    label: 'Education' },
    { value: 'Hospitality',  label: 'Hospitality' },
    { value: 'Construction', label: 'Construction' },
    { value: 'Finance',      label: 'Finance' },
    { value: 'Other',        label: 'Other' },
  ];

  readonly COMPANY_SIZE_OPTS: SelectOption[] = [
    { value: '1-10',    label: '1–10 employees' },
    { value: '11-50',   label: '11–50 employees' },
    { value: '51-200',  label: '51–200 employees' },
    { value: '201-500', label: '201–500 employees' },
    { value: '500+',    label: '500+ employees' },
  ];

  readonly SPONSOR_LICENCE_EDIT_OPTS: SelectOption[] = [
    { value: 'yes',     label: 'Yes' },
    { value: 'no',      label: 'No' },
    { value: 'applied', label: 'Applied' },
    { value: 'unknown', label: 'Unknown' },
  ];

  readonly LICENCE_RATING_OPTS: SelectOption[] = [
    { value: 'A-Rating',       label: 'A-Rating' },
    { value: 'B-Rating',       label: 'B-Rating' },
    { value: 'Not Applicable', label: 'Not Applicable' },
  ];

  readonly HIRES_PER_YEAR_OPTS: SelectOption[] = [
    { value: '1-5',   label: '1–5' },
    { value: '6-20',  label: '6–20' },
    { value: '21-50', label: '21–50' },
    { value: '50+',   label: '50+' },
  ];

  readonly DURATION_UNIT_OPTS: SelectOption[] = [
    { value: 'hours',  label: 'Hours' },
    { value: 'days',   label: 'Days' },
    { value: 'weeks',  label: 'Weeks' },
    { value: 'months', label: 'Months' },
    { value: 'years',  label: 'Years' },
  ];

  readonly ACCOUNT_STATUS_EDIT_OPTS: SelectOption[] = [
    { value: 'active',    label: 'Active' },
    { value: 'inactive',  label: 'Inactive' },
    { value: 'suspended', label: 'Suspended' },
  ];

  readonly sponsorCountryChipOpts: ChipOption[] = [
    { value: 'United Kingdom', label: '🇬🇧 United Kingdom' },
    { value: 'Germany',        label: '🇩🇪 Germany' },
    { value: 'Netherlands',    label: '🇳🇱 Netherlands' },
    { value: 'Canada',         label: '🇨🇦 Canada' },
    { value: 'Australia',      label: '🇦🇺 Australia' },
  ];

  readonly jobTypeChipOpts: ChipOption[] = [
    { value: 'Full Time',  label: 'Full Time' },
    { value: 'Part Time',  label: 'Part Time' },
    { value: 'Contract',   label: 'Contract' },
    { value: 'Internship', label: 'Internship' },
  ];

  // ── List state ──────────────────────────────────────────────────────────────
  recruiters: Recruiter[] = [];
  pagination = { page: 1, limit: 20, total: 0, pages: 0 };
  loading = false;
  advOpen = false;
  viewMode: 'list' | 'grid' = 'list';

  searchCtrl = new FormControl('');
  sortCtrl   = new FormControl('newest');
  exporting  = false;
  filterForm: FormGroup;

  selectedIds = new Set<string>();
  bulkProcessing = false;

  // ── Edit modal state ────────────────────────────────────────────────────────
  editingRecruiter: Recruiter | null = null;
  editForm!: FormGroup;
  editSaving    = false;
  editError     = '';
  editSubmitted = false;
  showCurrentPw = false;
  showNewPw     = false;
  showConfirmPw = false;

  constructor(
    private fb: FormBuilder,
    private recruiterService: RecruiterService,
    private master: MasterDataService,
    private toast: ToastService,
    private confirm: ConfirmDialogService,
    private route: ActivatedRoute,
  ) {
    this.filterForm = this.fb.group({
      company:            [''],
      companyCountry:     [''],
      industry:           [''],
      hasSponsorLicence:  [''],
      sponsorCountry:     [''],
      accountStatus:      [''],
      lastActive:         [''],
      joinedFrom:         [''],
      joinedTo:           [''],
    });
  }

  ngOnInit(): void {
    this.master.loadAll();
    this.load();
    this.sortCtrl.valueChanges.pipe(
      skip(1),
      distinctUntilChanged(),
    ).subscribe(() => this.onSortChange());

    // Auto-open edit modal when navigated from profile page with ?editId=
    const editId = this.route.snapshot.queryParamMap.get('editId');
    if (editId) {
      // Wait for list to load, then find and open the matching recruiter
      this.recruiterService.getById(editId).subscribe({
        next: (res) => this.openEdit(res.recruiter),
        error: () => { /* silently ignore if not found */ },
      });
    }
  }

  // ── Filter helpers ──────────────────────────────────────────────────────────
  get activeAdvCount(): number {
    const v = this.filterForm.value;
    return [
      v.company, v.companyCountry, v.industry, v.hasSponsorLicence,
      v.sponsorCountry, v.accountStatus, v.lastActive, v.joinedFrom, v.joinedTo,
    ].filter(x => x !== null && x !== '' && x !== undefined).length;
  }

  get hasAnyFilter(): boolean {
    if (this.searchCtrl.value) return true;
    const v = this.filterForm.value;
    return Object.values(v).some(x => x !== null && x !== '' && x !== undefined);
  }

  isExpired(dateStr: string): boolean {
    return new Date(dateStr) < new Date();
  }

  // ── Edit modal getters ──────────────────────────────────────────────────────
  editCtrl(name: string) { return this.editForm.get(name)!; }

  get editSponsorYes(): boolean {
    return this.editForm?.get('has_sponsor_licence')?.value === 'yes';
  }

  get editIsAgency(): boolean {
    return this.editForm?.get('type')?.value === 'recruitment_agency';
  }

  get editLicenceRatingA(): boolean {
    return this.editForm?.get('licence_rating')?.value === 'A-Rating';
  }

  get editLicenceRatingB(): boolean {
    return this.editForm?.get('licence_rating')?.value === 'B-Rating';
  }

  get expiryPreview(): string {
    const val  = this.editForm?.get('duration_value')?.value;
    const unit = this.editForm?.get('duration_unit')?.value;
    if (!val || !unit || val < 1) return '';
    const dt = this.computeExpiry(val, unit);
    return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  // ── Utility ─────────────────────────────────────────────────────────────────
  private computeExpiry(value: number, unit: string): Date {
    const dt = new Date();
    switch (unit) {
      case 'hours':  dt.setHours(dt.getHours() + value);       break;
      case 'days':   dt.setDate(dt.getDate() + value);          break;
      case 'weeks':  dt.setDate(dt.getDate() + value * 7);      break;
      case 'months': dt.setMonth(dt.getMonth() + value);        break;
      case 'years':  dt.setFullYear(dt.getFullYear() + value);  break;
    }
    return dt;
  }

  /** Split a combined phone string like "+447700900000" into dial code + number. */
  private splitPhone(combined: string | undefined | null): { dial: string; num: string } {
    if (!combined) return { dial: '+44', num: '' };
    const knownDials = ['+971', '+234', '+254', '+91', '+44', '+61', '+27', '+49', '+33', '+1'];
    for (const d of knownDials) {
      if (combined.startsWith(d)) return { dial: d, num: combined.slice(d.length) };
    }
    return { dial: '+44', num: combined };
  }

  // ── List actions ────────────────────────────────────────────────────────────
  onSortChange(): void { this.pagination.page = 1; this.load(); }

  search(): void { this.pagination.page = 1; this.load(); }

  load(): void {
    this.loading = true;
    const v = this.filterForm.value;
    this.recruiterService.list({
      search:            this.searchCtrl.value || undefined,
      company:           v.company           || undefined,
      companyCountry:    v.companyCountry    || undefined,
      industry:          v.industry          || undefined,
      hasSponsorLicence: v.hasSponsorLicence || undefined,
      sponsorCountry:    v.sponsorCountry    || undefined,
      accountStatus:     v.accountStatus     || undefined,
      lastActive:        v.lastActive        || undefined,
      joinedFrom:        v.joinedFrom        || undefined,
      joinedTo:          v.joinedTo          || undefined,
      sortBy:            this.sortCtrl.value  || 'newest',
      page:              this.pagination.page,
      limit:             this.pagination.limit,
    })
      .pipe(catchError(() => of(null)))
      .subscribe((res) => {
        this.loading = false;
        if (res) {
          this.recruiters = res.data;
          this.pagination = res.pagination;
        }
      });
  }

  clearFilters(): void {
    this.searchCtrl.setValue('');
    this.filterForm.reset({
      company: '', companyCountry: '', industry: '',
      hasSponsorLicence: '', sponsorCountry: '', accountStatus: '',
      lastActive: '', joinedFrom: '', joinedTo: '',
    });
    this.sortCtrl.setValue('newest');
    this.pagination.page = 1;
    this.load();
  }

  // ── Selection ────────────────────────────────────────────────────────────────
  get selectionCount(): number { return this.selectedIds.size; }
  isSelected(id: string): boolean { return this.selectedIds.has(id); }
  toggleSelect(id: string): void {
    if (this.selectedIds.has(id)) this.selectedIds.delete(id);
    else this.selectedIds.add(id);
  }
  isAllSelected(): boolean {
    return this.recruiters.length > 0 && this.recruiters.every(r => this.selectedIds.has(r.id));
  }
  isIndeterminate(): boolean { return this.selectedIds.size > 0 && !this.isAllSelected(); }
  toggleSelectAll(): void {
    if (this.isAllSelected()) this.recruiters.forEach(r => this.selectedIds.delete(r.id));
    else this.recruiters.forEach(r => this.selectedIds.add(r.id));
  }
  clearSelection(): void { this.selectedIds.clear(); }

  // ── Bulk actions ─────────────────────────────────────────────────────────────
  async bulkActivate(): Promise<void> {
    const ids = [...this.selectedIds];
    const ok = await this.confirm.confirm({
      title: 'Activate Recruiters',
      message: `Activate ${ids.length} recruiter${ids.length === 1 ? '' : 's'}?`,
      confirmLabel: 'Activate', confirmClass: 'btn-success',
    });
    if (!ok) return;
    this.bulkProcessing = true;
    this.recruiterService.bulkStatus(ids, true).subscribe({
      next: (res) => {
        this.toast.success(`${res.updated} recruiter${res.updated === 1 ? '' : 's'} activated`);
        this.clearSelection(); this.bulkProcessing = false; this.load();
      },
      error: (err) => {
        this.toast.error(err?.error?.message ?? 'Bulk activate failed');
        this.bulkProcessing = false;
      },
    });
  }

  async bulkDeactivate(): Promise<void> {
    const ids = [...this.selectedIds];
    const ok = await this.confirm.confirm({
      title: 'Deactivate Recruiters',
      message: `Deactivate ${ids.length} recruiter${ids.length === 1 ? '' : 's'}?`,
      confirmLabel: 'Deactivate', confirmClass: 'btn-warning',
    });
    if (!ok) return;
    this.bulkProcessing = true;
    this.recruiterService.bulkStatus(ids, false).subscribe({
      next: (res) => {
        this.toast.success(`${res.updated} recruiter${res.updated === 1 ? '' : 's'} deactivated`);
        this.clearSelection(); this.bulkProcessing = false; this.load();
      },
      error: (err) => {
        this.toast.error(err?.error?.message ?? 'Bulk deactivate failed');
        this.bulkProcessing = false;
      },
    });
  }

  bulkExportCsv(): void {
    if (!this.selectedIds.size) return;
    this.bulkProcessing = true;
    this.recruiterService.exportSelected([...this.selectedIds]).subscribe({
      next: (blob) => {
        this._downloadBlob(blob, `recruiters-selected-${new Date().toISOString().slice(0, 10)}.csv`);
        this.bulkProcessing = false;
      },
      error: () => { this.toast.error('Export failed. Please try again.'); this.bulkProcessing = false; },
    });
  }

  exportCsv(): void {
    if (this.exporting) return;
    this.exporting = true;
    const v = this.filterForm.value;
    this.recruiterService.exportCsv({
      search:            this.searchCtrl.value || undefined,
      company:           v.company            || undefined,
      companyCountry:    v.companyCountry     || undefined,
      industry:          v.industry           || undefined,
      hasSponsorLicence: v.hasSponsorLicence  || undefined,
      sponsorCountry:    v.sponsorCountry     || undefined,
      accountStatus:     v.accountStatus      || undefined,
      lastActive:        v.lastActive         || undefined,
      joinedFrom:        v.joinedFrom         || undefined,
      joinedTo:          v.joinedTo           || undefined,
    }).subscribe({
      next: (blob) => {
        this._downloadBlob(blob, `recruiters-${new Date().toISOString().slice(0, 10)}.csv`);
        this.exporting = false;
      },
      error: () => { this.toast.error('Export failed. Please try again.'); this.exporting = false; },
    });
  }

  private _downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.pagination.pages) return;
    this.pagination.page = page;
    this.load();
  }

  pageNumbers(): number[] {
    const { page, pages } = this.pagination;
    const start = Math.max(1, page - 2);
    const end   = Math.min(pages, page + 2);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  // ── Edit modal ──────────────────────────────────────────────────────────────
  openEdit(rec: Recruiter): void {
    this.editingRecruiter = rec;
    this.editError        = '';
    this.editSubmitted    = false;
    this.showCurrentPw    = false;
    this.showNewPw        = false;
    this.showConfirmPw    = false;

    const ph = this.splitPhone(rec.phone);
    const wa = this.splitPhone(rec.whatsapp_number);

    this.editForm = this.fb.group({
      // Section 1: Contact
      contact_name:      [rec.contact_name, [Validators.required, Validators.minLength(3), Validators.maxLength(100), Validators.pattern(/^[a-zA-Z\s'\-\.]+$/)]],
      type:              [rec.type ?? 'direct_employer'],
      contact_job_title: [rec.contact_job_title ?? '', [Validators.minLength(2), Validators.maxLength(100)]],
      email:             [rec.email, [Validators.required, emailValidator()]],
      phone_dial_code:   [ph.dial],
      phone_number:      [ph.num, Validators.required],
      whatsapp_dial_code:    [wa.dial],
      whatsapp_number:       [wa.num, Validators.required],
      whatsapp_same_as_phone: [false],
      // Section 2: Company
      company_name:    [rec.company_name    ?? '', [Validators.minLength(2), Validators.maxLength(150)]],
      company_website: [rec.company_website ?? '', [websiteValidator()]],
      company_country: [rec.company_country ?? null],
      company_city:    [rec.company_city    ?? null],
      industry:        [rec.industry        ?? null],
      company_size:    [rec.company_size    ?? null],
      // Section 4: Sponsor Licence
      has_sponsor_licence:       [rec.has_sponsor_licence       ?? null],
      sponsor_licence_number:    [rec.sponsor_licence_number    ?? ''],
      sponsor_licence_countries: [rec.sponsor_licence_countries ?? []],
      licence_rating:            [rec.licence_rating            ?? null],
      licence_verified:          [rec.licence_verified          ?? false],
      // Section 5: Hiring Preferences
      target_nationalities: [rec.target_nationalities ?? []],
      countries_place_in:   [rec.countries_place_in   ?? []],
      sectors_recruit_for:  [rec.sectors_recruit_for  ?? []],
      hires_per_year:       [rec.hires_per_year        ?? null],
      job_types:            [rec.job_types             ?? []],
      // Section 6: Account
      is_active_str:  [rec.is_active ? 'active' : 'inactive'],
      free_account:   [rec.free_account ?? false],
      admin_notes:    [rec.admin_notes  ?? ''],
      duration_value: [null as number | null],
      duration_unit:  [null],
      // Section 7: Credentials
      new_password:     ['', [Validators.minLength(8), Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/)]],
      confirm_password: [''],
    }, {
      validators: [
        passwordsMatchValidator,
        makePhoneGroupValidator('phone_dial_code', 'phone_number'),
        makePhoneGroupValidator('whatsapp_dial_code', 'whatsapp_number'),
      ],
    });

    // Sponsor licence → conditional required on licence number
    this.editForm.get('has_sponsor_licence')!.valueChanges.subscribe((v: string | null) => {
      const licCtrl = this.editCtrl('sponsor_licence_number');
      if (v === 'yes') {
        licCtrl.addValidators([Validators.required, Validators.minLength(3), Validators.maxLength(100)]);
      } else {
        licCtrl.clearValidators();
      }
      licCtrl.updateValueAndValidity();
    });
    // Trigger immediately if already 'yes'
    if (rec.has_sponsor_licence === 'yes') {
      const licCtrl = this.editCtrl('sponsor_licence_number');
      licCtrl.addValidators([Validators.required, Validators.minLength(3), Validators.maxLength(100)]);
      licCtrl.updateValueAndValidity();
    }

    // Company country → city cascade
    this.editForm.get('company_country')!.valueChanges.subscribe((v: string | null) => {
      this.editForm.patchValue({ company_city: null }, { emitEvent: false });
      if (!v) { this.master.cities.set([]); return; }
      const country = this.master.countries().find(c => c.name === String(v));
      if (country) this.master.loadCities(country.id);
    });
    // Pre-load cities for current country
    if (rec.company_country) {
      const country = this.master.countries().find(c => c.name === rec.company_country);
      if (country) this.master.loadCities(country.id);
    }

    // WhatsApp "same as phone" sync
    this.editForm.get('whatsapp_same_as_phone')!.valueChanges.subscribe((checked: boolean) => {
      if (checked) {
        const raw = this.editForm.getRawValue();
        this.editForm.patchValue({
          whatsapp_dial_code: raw.phone_dial_code || '+44',
          whatsapp_number:    raw.phone_number    || '',
        }, { emitEvent: false });
        this.editCtrl('whatsapp_number').updateValueAndValidity();
      }
    });
    this.editForm.get('phone_number')!.valueChanges.subscribe(() => {
      if (this.editForm.get('whatsapp_same_as_phone')?.value) {
        const raw = this.editForm.getRawValue();
        this.editForm.patchValue({
          whatsapp_dial_code: raw.phone_dial_code || '+44',
          whatsapp_number:    raw.phone_number    || '',
        }, { emitEvent: false });
      }
    });
    this.editForm.get('phone_dial_code')!.valueChanges.subscribe(() => {
      if (this.editForm.get('whatsapp_same_as_phone')?.value) {
        const raw = this.editForm.getRawValue();
        this.editForm.patchValue({ whatsapp_dial_code: raw.phone_dial_code }, { emitEvent: false });
      }
    });
  }

  closeEdit(): void {
    this.editingRecruiter = null;
    this.editSaving       = false;
    this.editError        = '';
    this.editSubmitted    = false;
    this.master.cities.set([]);
  }

  editInvalid(field: string): boolean {
    const c = this.editForm?.get(field);
    return !!(c && c.invalid && c.touched);
  }

  saveEdit(): void {
    this.editSubmitted = true;
    if (this.editForm.invalid) { this.editForm.markAllAsTouched(); return; }
    if (!this.editingRecruiter) return;
    this.editSaving = true;
    this.editError  = '';

    const val = this.editForm.value;
    const phone    = `${val.phone_dial_code}${val.phone_number}`;
    const whatsapp = val.whatsapp_same_as_phone
      ? phone
      : `${val.whatsapp_dial_code}${val.whatsapp_number}`;
    const sponsorYes = val.has_sponsor_licence === 'yes';

    const payload: Record<string, unknown> = {
      contact_name:      val.contact_name,
      type:              val.type,
      contact_job_title: val.contact_job_title || null,
      email:             val.email,
      phone:             phone || null,
      whatsapp_number:   whatsapp || null,
      company_name:      val.company_name      || null,
      company_website:   val.company_website   || null,
      company_country:   val.company_country   || null,
      company_city:      val.company_city      || null,
      company_size:      val.company_size      || null,
      industry:          val.industry          || null,
      has_sponsor_licence:       val.has_sponsor_licence || null,
      sponsor_licence_number:    sponsorYes ? (val.sponsor_licence_number || null) : null,
      sponsor_licence_countries: sponsorYes ? (val.sponsor_licence_countries?.length ? val.sponsor_licence_countries : null) : null,
      licence_rating:            sponsorYes ? (val.licence_rating || null) : null,
      licence_verified:          sponsorYes ? (val.licence_verified ?? false) : false,
      target_nationalities: val.target_nationalities?.length ? val.target_nationalities : null,
      countries_place_in:   val.countries_place_in?.length  ? val.countries_place_in  : null,
      sectors_recruit_for:  val.sectors_recruit_for?.length ? val.sectors_recruit_for : null,
      hires_per_year:       val.hires_per_year || null,
      job_types:            val.job_types?.length ? val.job_types : null,
      is_active:    val.is_active_str !== 'inactive',
      free_account: val.free_account ?? false,
      admin_notes:  val.admin_notes  || null,
    };

    if (val.new_password) payload['new_password'] = val.new_password;
    if (val.duration_value && val.duration_unit) {
      payload['access_expires_at'] = this.computeExpiry(val.duration_value, val.duration_unit).toISOString();
    }

    this.recruiterService.update(this.editingRecruiter.id, payload as any).subscribe({
      next: () => {
        this.editSaving = false;
        this.toast.success('Recruiter updated');
        this.closeEdit();
        this.load();
      },
      error: (err) => {
        this.editSaving = false;
        this.editError  = err?.error?.message ?? 'Failed to update recruiter.';
      },
    });
  }

  // ── Other actions ────────────────────────────────────────────────────────────
  async resendCredentials(rec: Recruiter): Promise<void> {
    const ok = await this.confirm.confirm({
      title: 'Resend Credentials',
      message: `Resend login credentials to ${rec.email}?`,
      confirmLabel: 'Send', confirmClass: 'btn-primary',
    });
    if (!ok) return;
    this.recruiterService.resendCredentials(rec.id).subscribe({
      next: () => this.toast.success(`Credentials sent to ${rec.email}`),
      error: (err) => this.toast.error(err?.error?.message ?? 'Failed to resend credentials'),
    });
  }

  async deleteRecruiter(rec: Recruiter): Promise<void> {
    const ok = await this.confirm.confirm({
      title: 'Delete Recruiter',
      message: `Delete ${rec.contact_name}? This action is irreversible.`,
      confirmLabel: 'Delete', confirmClass: 'btn-danger',
    });
    if (!ok) return;
    this.recruiterService.delete(rec.id).subscribe({
      next: () => { this.toast.success('Recruiter deleted'); this.load(); },
      error: (err) => this.toast.error(err?.error?.message ?? 'Failed to delete'),
    });
  }

  async toggleActive(rec: Recruiter): Promise<void> {
    const activate = !rec.is_active;
    const ok = await this.confirm.confirm({
      title:        activate ? 'Activate Recruiter' : 'Deactivate Recruiter',
      message:      `${activate ? 'Activate' : 'Deactivate'} ${rec.contact_name}?`,
      confirmLabel: activate ? 'Activate' : 'Deactivate',
      confirmClass: activate ? 'btn-success' : 'btn-warning',
    });
    if (!ok) return;
    this.recruiterService.update(rec.id, { is_active: activate }).subscribe({
      next: () => { this.toast.success(`Recruiter ${activate ? 'activated' : 'deactivated'}`); this.load(); },
      error: (err) => this.toast.error(err?.error?.message ?? 'Failed to update status'),
    });
  }
}
