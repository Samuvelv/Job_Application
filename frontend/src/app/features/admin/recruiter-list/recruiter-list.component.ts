// src/app/features/admin/recruiter-list/recruiter-list.component.ts
import { Component, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormControl, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
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

function passwordsMatchValidator(g: AbstractControl): ValidationErrors | null {
  const pw  = g.get('new_password')?.value;
  const cpw = g.get('confirm_password')?.value;
  if (!pw) return null; // password optional — no match check if empty
  return pw === cpw ? null : { passwordsMismatch: true };
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
          <select class="form-select form-select-sm cl-sort-select"
            [formControl]="sortCtrl"
            (change)="onSortChange()"
            title="Sort recruiters">
            @for (opt of RECRUITER_SORT_OPTIONS; track opt.value) {
              <option [value]="opt.value">{{ opt.label }}</option>
            }
          </select>
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
                <select class="form-select form-select-sm" formControlName="industry">
                  <option value="">All Industries</option>
                  @for (opt of INDUSTRY_OPTIONS; track opt) {
                    <option [value]="opt">{{ opt }}</option>
                  }
                </select>
              </div>
            </div>

            <!-- ── Sponsor Licence ─────────────────────────────────────── -->
            <p class="filter-card__group-label">Sponsor Licence</p>
            <div class="row g-2 mb-3">
              <div class="col-sm-6 col-md-4 col-lg-3">
                <label class="filter-card__section-label">Holds Sponsor Licence</label>
                <select class="form-select form-select-sm" formControlName="hasSponsorLicence">
                  <option value="">Any</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                  <option value="unknown">Unknown</option>
                </select>
              </div>
              <div class="col-sm-6 col-md-4 col-lg-3">
                <label class="filter-card__section-label">Sponsor Licence Country</label>
                <select class="form-select form-select-sm" formControlName="sponsorCountry">
                  <option value="">Any Country</option>
                  @for (opt of SPONSOR_COUNTRY_OPTIONS; track opt) {
                    <option [value]="opt">{{ opt }}</option>
                  }
                </select>
              </div>
            </div>

            <!-- ── Status & Activity ───────────────────────────────────── -->
            <p class="filter-card__group-label">Status &amp; Activity</p>
            <div class="row g-2 mb-3">
              <div class="col-sm-6 col-md-4 col-lg-3">
                <label class="filter-card__section-label">Account Status</label>
                <select class="form-select form-select-sm" formControlName="accountStatus">
                  <option value="">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="expired">Expired Access</option>
                </select>
              </div>
              <div class="col-sm-6 col-md-4 col-lg-3">
                <label class="filter-card__section-label">Last Active</label>
                <select class="form-select form-select-sm" formControlName="lastActive">
                  <option value="">Any Time</option>
                  <option value="7_days">Within 7 days</option>
                  <option value="30_days">Within 30 days</option>
                  <option value="90_days">Within 90 days</option>
                </select>
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

    <!-- ── Edit Recruiter Panel (slide-in overlay) ── -->
    @if (editingRecruiter) {
      <div class="file-preview-overlay" (click)="closeEdit()">
        <div class="rec-edit-panel" (click)="$event.stopPropagation()">

          <!-- Header -->
          <div class="rec-edit-panel__header">
            <div class="rec-edit-panel__avatar">
              {{ editingRecruiter.contact_name.charAt(0).toUpperCase() }}
            </div>
            <div class="rec-edit-panel__title-group">
              <div class="rec-edit-panel__title">Edit Recruiter</div>
              <div class="rec-edit-panel__subtitle">{{ editingRecruiter.contact_name }}</div>
            </div>
            <button type="button" class="file-preview-dialog__close" (click)="closeEdit()">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>

          <!-- Scrollable body -->
          <div class="rec-edit-panel__body">
            <form [formGroup]="editForm" (ngSubmit)="saveEdit()">

              <!-- ── Section: Profile ── -->
              <div class="rep-section">
                <div class="rep-section__label">
                  <i class="bi bi-person"></i> Profile
                </div>
                <div class="mb-3">
                  <label class="form-label">Contact Name <span class="text-danger">*</span></label>
                  <input formControlName="contact_name" class="form-control"
                    placeholder="Full name"
                    [class.is-invalid]="editInvalid('contact_name')">
                  @if (editInvalid('contact_name')) {
                    <div class="invalid-feedback">Contact name is required.</div>
                  }
                </div>
                <div class="mb-0">
                  <label class="form-label">Company Name <span class="rep-optional">optional</span></label>
                  <input formControlName="company_name" class="form-control" placeholder="e.g. Acme Corp">
                </div>
              </div>

              <!-- ── Section: Contact Details ── -->
              <div class="rep-section">
                <div class="rep-section__label">
                  <i class="bi bi-envelope"></i> Contact Details
                </div>
                <div class="mb-3">
                  <label class="form-label">Job Title / Role <span class="rep-optional">optional</span></label>
                  <input formControlName="contact_job_title" class="form-control" placeholder="e.g. Talent Acquisition Manager">
                </div>
                <div class="mb-3">
                  <label class="form-label">Work Email <span class="text-danger">*</span></label>
                  <input formControlName="email" type="email" class="form-control"
                    [class.is-invalid]="editInvalid('email')"
                    placeholder="recruiter@company.com">
                  @if (editInvalid('email')) {
                    <div class="invalid-feedback">Valid email is required.</div>
                  }
                </div>
                <div class="mb-0">
                  <label class="form-label">Phone / WhatsApp <span class="rep-optional">optional</span></label>
                  <input formControlName="phone" class="form-control" placeholder="+44 7700 900000">
                </div>
              </div>

              <!-- ── Section: Company Details ── -->
              <div class="rep-section">
                <div class="rep-section__label">
                  <i class="bi bi-building"></i> Company Details
                </div>
                <div class="mb-3">
                  <label class="form-label">Company Website <span class="rep-optional">optional</span></label>
                  <input formControlName="company_website" class="form-control" placeholder="https://example.com">
                </div>
                <div class="mb-3">
                  <label class="form-label">Company Country</label>
                  <app-searchable-select formControlName="company_country" [options]="countryOpts()" placeholder="Select country" />
                </div>
                <div class="mb-3">
                  <label class="form-label">Company City <span class="rep-optional">optional</span></label>
                  <input formControlName="company_city" class="form-control" placeholder="London">
                </div>
                <div class="mb-0">
                  <label class="form-label">Industry / Sector</label>
                  <app-searchable-select formControlName="industry" [options]="industryOpts()" placeholder="Select industry" />
                </div>
              </div>

              <!-- ── Section: Sponsor Licence ── -->
              <div class="rep-section">
                <div class="rep-section__label">
                  <i class="bi bi-patch-check"></i> Sponsor Licence
                </div>
                <div class="mb-3">
                  <label class="form-label">Holds Sponsor Licence</label>
                  <select formControlName="has_sponsor_licence" class="form-select">
                    <option value="">— Select —</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                    <option value="unknown">Unknown</option>
                  </select>
                </div>
                @if (editSponsorYes) {
                  <div class="mb-3">
                    <label class="form-label">Licence Number <span class="rep-optional">optional</span></label>
                    <input formControlName="sponsor_licence_number" class="form-control" placeholder="e.g. 1Z3GF3C...">
                  </div>
                  <div class="mb-0">
                    <label class="form-label">Licence Countries</label>
                    <app-chip-multi-select formControlName="sponsor_licence_countries" [options]="nationalityOpts()" placeholder="Select countries" />
                  </div>
                }
              </div>

              <!-- ── Section: Hiring Preferences ── -->
              <div class="rep-section">
                <div class="rep-section__label">
                  <i class="bi bi-people"></i> Hiring Preferences
                </div>
                <div class="mb-3">
                  <label class="form-label">Target Nationalities</label>
                  <app-chip-multi-select formControlName="target_nationalities" [options]="nationalityOpts()" placeholder="Select nationalities to hire" />
                </div>
                <div class="mb-0">
                  <label class="form-label">Hires Per Year</label>
                  <select formControlName="hires_per_year" class="form-select">
                    <option value="">— Select —</option>
                    <option value="1-5">1 – 5</option>
                    <option value="6-10">6 – 10</option>
                    <option value="11-20">11 – 20</option>
                    <option value="21-50">21 – 50</option>
                    <option value="51+">51+</option>
                  </select>
                </div>
              </div>

              <!-- ── Section: Access Expiry ── -->
              <div class="rep-section">
                <div class="rep-section__label">
                  <i class="bi bi-clock-history"></i> Extend Access
                </div>
                <div class="mb-2">
                  <label class="form-label">Duration <span class="rep-optional">leave blank to keep current</span></label>
                  <div class="rep-duration-row">
                    <input type="number" formControlName="duration_value" class="form-control rep-duration-num"
                      placeholder="e.g. 6" min="1">
                    <select formControlName="duration_unit" class="form-select rep-duration-unit">
                      <option value="">— Unit —</option>
                      <option value="hours">Hours</option>
                      <option value="days">Days</option>
                      <option value="weeks">Weeks</option>
                      <option value="months">Months</option>
                      <option value="years">Years</option>
                    </select>
                  </div>
                </div>
                @if (expiryPreview) {
                  <div class="rep-expiry-preview">
                    <i class="bi bi-calendar-check"></i>
                    New expiry: <strong>{{ expiryPreview }}</strong>
                  </div>
                } @else if (editingRecruiter.access_expires_at) {
                  <div class="rep-expiry-current" [class.rep-expiry-current--expired]="isExpired(editingRecruiter.access_expires_at)">
                    <i class="bi bi-calendar{{ isExpired(editingRecruiter.access_expires_at) ? '-x' : '2' }}"></i>
                    Current expiry: <strong>{{ editingRecruiter.access_expires_at | date:'dd MMM yyyy, HH:mm' }}</strong>
                    @if (isExpired(editingRecruiter.access_expires_at)) {
                      <span class="badge bg-danger ms-1" style="font-size:.65rem">Expired</span>
                    }
                  </div>
                }
              </div>

              <!-- ── Section: Credentials ── -->
              <div class="rep-section">
                <div class="rep-section__label">
                  <i class="bi bi-shield-lock"></i> Credentials
                </div>

                <!-- Current password (read-only) -->
                <div class="mb-3">
                  <label class="form-label">Current Password</label>
                  <div class="rep-pw-wrap">
                    <input [type]="showCurrentPw ? 'text' : 'password'"
                      class="form-control rep-pw-input"
                      [value]="editingRecruiter.plain_password ?? ''" readonly>
                    <button type="button" class="rep-pw-eye" (click)="showCurrentPw = !showCurrentPw"
                      [title]="showCurrentPw ? 'Hide' : 'Show'">
                      <i class="bi" [class.bi-eye]="!showCurrentPw" [class.bi-eye-slash]="showCurrentPw"></i>
                    </button>
                  </div>
                </div>

                <!-- New password -->
                <div class="mb-3">
                  <label class="form-label">New Password <span class="rep-optional">optional</span></label>
                  <div class="rep-pw-wrap">
                    <input [type]="showNewPw ? 'text' : 'password'" formControlName="new_password"
                      class="form-control rep-pw-input" placeholder="Min 8 characters"
                      [class.is-invalid]="editInvalid('new_password')">
                    <button type="button" class="rep-pw-eye" (click)="showNewPw = !showNewPw"
                      [title]="showNewPw ? 'Hide' : 'Show'">
                      <i class="bi" [class.bi-eye]="!showNewPw" [class.bi-eye-slash]="showNewPw"></i>
                    </button>
                  </div>
                  @if (editInvalid('new_password')) {
                    <div class="rep-field-error">Minimum 8 characters.</div>
                  }
                </div>

                <!-- Confirm password -->
                <div class="mb-0">
                  <label class="form-label">Confirm New Password</label>
                  <div class="rep-pw-wrap">
                    <input [type]="showConfirmPw ? 'text' : 'password'" formControlName="confirm_password"
                      class="form-control rep-pw-input" placeholder="Repeat new password"
                      [class.is-invalid]="editForm.hasError('passwordsMismatch') && editForm.get('confirm_password')?.touched">
                    <button type="button" class="rep-pw-eye" (click)="showConfirmPw = !showConfirmPw"
                      [title]="showConfirmPw ? 'Hide' : 'Show'">
                      <i class="bi" [class.bi-eye]="!showConfirmPw" [class.bi-eye-slash]="showConfirmPw"></i>
                    </button>
                  </div>
                  @if (editForm.hasError('passwordsMismatch') && editForm.get('confirm_password')?.touched) {
                    <div class="rep-field-error">Passwords do not match.</div>
                  }
                </div>
              </div>

              <!-- ── Section: Account Management ── -->
              <div class="rep-section">
                <div class="rep-section__label">
                  <i class="bi bi-gear"></i> Account Management
                </div>
                <div class="mb-3">
                  <label class="form-label">Account Status</label>
                  <select formControlName="is_active_str" class="form-select">
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div class="mb-0">
                  <label class="form-label">Admin Notes <span class="rep-optional">internal only</span></label>
                  <textarea formControlName="admin_notes" class="form-control" rows="3"
                    placeholder="Internal notes — not visible to recruiter"></textarea>
                </div>
              </div>

              <!-- Error -->
              @if (editError) {
                <div class="alert alert-danger small py-2 mb-3">
                  <i class="bi bi-exclamation-triangle me-1"></i>{{ editError }}
                </div>
              }

              <!-- Footer actions -->
              <div class="rec-edit-panel__footer">
                <button type="button" class="btn btn-outline-secondary" (click)="closeEdit()">
                  Cancel
                </button>
                <button type="submit" class="btn btn-primary" [disabled]="editSaving">
                  @if (editSaving) {
                    <span class="spinner-border spinner-border-sm me-1"></span> Saving…
                  } @else {
                    <i class="bi bi-check-lg me-1"></i> Save Changes
                  }
                </button>
              </div>

            </form>
          </div>
        </div>
      </div>
    }
  `,
})
export class RecruiterListComponent implements OnInit {
  readonly RECRUITER_SORT_OPTIONS = RECRUITER_SORT_OPTIONS;

  countryOpts = computed<SelectOption[]>(() =>
    this.master.countries().map(c => ({ value: c.name, label: `${c.flag_emoji} ${c.name}` }))
  );
  industryOpts = computed<SelectOption[]>(() =>
    this.master.industries().map(i => ({ value: i.name, label: i.name }))
  );
  nationalityOpts = computed<ChipOption[]>(() =>
    this.master.countries().map(c => ({ value: c.name, label: `${c.flag_emoji} ${c.name}` }))
  );

  readonly INDUSTRY_OPTIONS = [
    'Healthcare', 'IT', 'Engineering', 'Finance',
    'Care', 'Education', 'Hospitality', 'Construction',
  ];
  readonly SPONSOR_COUNTRY_OPTIONS = [
    'United Kingdom', 'Germany', 'Netherlands', 'Canada', 'Australia',
    'United States', 'France', 'Ireland', 'New Zealand', 'Singapore',
  ];

  recruiters: Recruiter[] = [];
  pagination = { page: 1, limit: 20, total: 0, pages: 0 };
  loading = false;
  advOpen = false;
  viewMode: 'list' | 'grid' = 'list';

  searchCtrl = new FormControl('');
  sortCtrl   = new FormControl('newest');
  exporting  = false;
  filterForm: FormGroup;

  // Selection state
  selectedIds = new Set<string>();
  bulkProcessing = false;

  // Edit panel state
  editingRecruiter: Recruiter | null = null;
  editForm!: FormGroup;
  editSaving = false;
  editError  = '';
  showCurrentPw = false;
  showNewPw     = false;
  showConfirmPw = false;

  constructor(
    private fb: FormBuilder,
    private recruiterService: RecruiterService,
    private master: MasterDataService,
    private toast: ToastService,
    private confirm: ConfirmDialogService,
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
  }

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

  get editSponsorYes(): boolean {
    return this.editForm?.get('has_sponsor_licence')?.value === 'yes';
  }

  get expiryPreview(): string {
    const val  = this.editForm?.get('duration_value')?.value;
    const unit = this.editForm?.get('duration_unit')?.value;
    if (!val || !unit || val < 1) return '';
    const dt = this.computeExpiry(val, unit);
    return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  private computeExpiry(value: number, unit: string): Date {
    const dt = new Date();
    switch (unit) {
      case 'hours':  dt.setHours(dt.getHours() + value);        break;
      case 'days':   dt.setDate(dt.getDate() + value);           break;
      case 'weeks':  dt.setDate(dt.getDate() + value * 7);       break;
      case 'months': dt.setMonth(dt.getMonth() + value);         break;
      case 'years':  dt.setFullYear(dt.getFullYear() + value);   break;
    }
    return dt;
  }

  onSortChange(): void {
    this.pagination.page = 1;
    this.load();
  }

  search(): void {
    this.pagination.page = 1;
    this.load();
  }

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
          this.recruiters  = res.data;
          this.pagination  = res.pagination;
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

  // ── Selection ───────────────────────────────────────────────────────────────
  get selectionCount(): number { return this.selectedIds.size; }

  isSelected(id: string): boolean { return this.selectedIds.has(id); }

  toggleSelect(id: string): void {
    if (this.selectedIds.has(id)) this.selectedIds.delete(id);
    else this.selectedIds.add(id);
  }

  isAllSelected(): boolean {
    return this.recruiters.length > 0 && this.recruiters.every(r => this.selectedIds.has(r.id));
  }

  isIndeterminate(): boolean {
    return this.selectedIds.size > 0 && !this.isAllSelected();
  }

  toggleSelectAll(): void {
    if (this.isAllSelected()) {
      this.recruiters.forEach(r => this.selectedIds.delete(r.id));
    } else {
      this.recruiters.forEach(r => this.selectedIds.add(r.id));
    }
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
        this.clearSelection();
        this.bulkProcessing = false;
        this.load();
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
    debugger
    this.recruiterService.bulkStatus(ids, false).subscribe({
      next: (res) => {
        this.toast.success(`${res.updated} recruiter${res.updated === 1 ? '' : 's'} deactivated`);
        this.clearSelection();
        this.bulkProcessing = false;
        this.load();
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
      error: () => {
        this.toast.error('Export failed. Please try again.');
        this.bulkProcessing = false;
      },
    });
  }

  exportCsv(): void {
    if (this.exporting) return;
    this.exporting = true;
    const v = this.filterForm.value;
    this.recruiterService.exportCsv({
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
    }).subscribe({
      next: (blob) => {
        this._downloadBlob(blob, `recruiters-${new Date().toISOString().slice(0, 10)}.csv`);
        this.exporting = false;
      },
      error: () => {
        this.toast.error('Export failed. Please try again.');
        this.exporting = false;
      },
    });
  }

  private _downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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

  // ── Edit panel ─────────────────────────────────────────────────────────────
  openEdit(rec: Recruiter): void {
    this.editingRecruiter = rec;
    this.editError        = '';
    this.showCurrentPw    = false;
    this.showNewPw        = false;
    this.showConfirmPw    = false;
    this.editForm = this.fb.group({
      // Profile
      contact_name:      [rec.contact_name, Validators.required],
      company_name:      [rec.company_name ?? ''],
      // Contact Details
      contact_job_title: [rec.contact_job_title ?? ''],
      email:             [rec.email, [Validators.required, Validators.email]],
      phone:             [rec.phone ?? ''],
      // Company Details
      company_website:   [rec.company_website ?? ''],
      company_country:   [rec.company_country ?? null],
      company_city:      [rec.company_city ?? ''],
      industry:          [rec.industry ?? null],
      // Sponsor Licence
      has_sponsor_licence:       [rec.has_sponsor_licence ?? ''],
      sponsor_licence_number:    [rec.sponsor_licence_number ?? ''],
      sponsor_licence_countries: [rec.sponsor_licence_countries ?? []],
      // Hiring Preferences
      target_nationalities: [rec.target_nationalities ?? []],
      hires_per_year:       [rec.hires_per_year ?? ''],
      // Account Management
      is_active_str: [rec.is_active ? 'active' : 'inactive'],
      admin_notes:   [rec.admin_notes ?? ''],
      // Access extension
      duration_value:   [null as number | null],
      duration_unit:    [''],
      // Credentials
      new_password:     ['', [Validators.minLength(8)]],
      confirm_password: [''],
    }, { validators: passwordsMatchValidator });
  }

  closeEdit(): void {
    this.editingRecruiter = null;
    this.editSaving       = false;
    this.editError        = '';
  }

  editInvalid(field: string): boolean {
    const c = this.editForm?.get(field);
    return !!(c && c.invalid && c.touched);
  }

  saveEdit(): void {
    if (this.editForm.invalid) { this.editForm.markAllAsTouched(); return; }
    if (!this.editingRecruiter) return;
    this.editSaving = true;
    this.editError  = '';

    const val = this.editForm.value;
    const sponsorYes = val.has_sponsor_licence === 'yes';

    const payload: Record<string, unknown> = {
      // Profile
      contact_name:      val.contact_name,
      company_name:      val.company_name || null,
      // Contact Details
      email:             val.email,
      contact_job_title: val.contact_job_title || null,
      phone:             val.phone || null,
      // Company Details
      company_website:   val.company_website || null,
      company_country:   val.company_country || null,
      company_city:      val.company_city || null,
      industry:          val.industry || null,
      // Sponsor Licence
      has_sponsor_licence:       val.has_sponsor_licence || null,
      sponsor_licence_number:    sponsorYes ? (val.sponsor_licence_number || null) : null,
      sponsor_licence_countries: sponsorYes ? (val.sponsor_licence_countries?.length ? val.sponsor_licence_countries : null) : null,
      // Hiring Preferences
      target_nationalities: val.target_nationalities?.length ? val.target_nationalities : null,
      hires_per_year:       val.hires_per_year || null,
      // Account Management
      is_active:  val.is_active_str !== 'inactive',
      admin_notes: val.admin_notes || null,
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

  // ── Resend credentials ──────────────────────────────────────────────────────
  async resendCredentials(rec: Recruiter): Promise<void> {
    const ok = await this.confirm.confirm({
      title: 'Resend Credentials',
      message: `Resend login credentials to ${rec.email}?`,
      confirmLabel: 'Send',
      confirmClass: 'btn-primary',
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
      confirmLabel: 'Delete',
      confirmClass: 'btn-danger',
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
