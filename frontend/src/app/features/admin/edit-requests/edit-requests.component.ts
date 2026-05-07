// src/app/features/admin/edit-requests/edit-requests.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { EditRequestService } from '../../../core/services/edit-request.service';
import { EditRequestCounts } from '../../../core/services/edit-request.service';
import { ContactRequestService } from '../../../core/services/contact-request.service';
import { ContactRequestCounts } from '../../../core/services/contact-request.service';
import { EditRequest, EditRequestType } from '../../../core/models/edit-request.model';
import { ContactRequest } from '../../../core/models/contact-request.model';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { EditRequestCardComponent } from '../../../shared/components/edit-request-card/edit-request-card.component';
import { ContactRequestCardComponent } from '../../../shared/components/contact-request-card/contact-request-card.component';

@Component({
  selector: 'app-edit-requests',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, PageHeaderComponent, EmptyStateComponent, EditRequestCardComponent, ContactRequestCardComponent],
  styles: [`
    .filter-bar {
      background: var(--th-surface);
      border: 1px solid var(--th-border);
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 20px;
    }
    .filter-bar__row {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      align-items: flex-end;
    }
    .filter-bar__group {
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex: 1 1 160px;
      min-width: 140px;
    }
    .filter-bar__group--wide {
      flex: 2 1 220px;
    }
    .filter-bar__label {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--th-muted);
    }
    .filter-bar__input {
      height: 38px;
      border-radius: 8px;
      border: 1px solid var(--th-border-strong);
      padding: 0 10px;
      font-size: 14px;
      background: var(--th-surface-2);
      color: var(--th-text);
      transition: border-color 0.15s, background 0.15s;
      width: 100%;
    }
    .filter-bar__input:focus {
      outline: none;
      border-color: var(--th-primary);
      background: var(--th-surface);
    }
    .filter-bar__select {
      height: 38px;
      border-radius: 8px;
      border: 1px solid var(--th-border-strong);
      padding: 0 10px;
      font-size: 14px;
      background: var(--th-surface-2);
      color: var(--th-text);
      width: 100%;
      cursor: pointer;
      transition: border-color 0.15s;
    }
    .filter-bar__select:focus {
      outline: none;
      border-color: var(--th-primary);
    }
    .filter-bar__select option {
      background: var(--th-surface);
      color: var(--th-text);
    }
    .filter-bar__clear {
      height: 38px;
      padding: 0 14px;
      border-radius: 8px;
      border: 1px solid var(--th-border-strong);
      background: transparent;
      color: var(--th-muted);
      font-size: 13px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      white-space: nowrap;
      transition: all 0.15s;
      align-self: flex-end;
    }
    .filter-bar__clear:hover {
      border-color: var(--th-danger);
      color: var(--th-danger);
      background: var(--th-danger-soft);
    }
    .filter-bar__active-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: var(--th-primary);
      color: #fff;
      font-size: 10px;
      font-weight: 700;
    }

    /* ── Bulk toolbar ── */
    .bulk-toolbar {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 14px;
      margin-bottom: 14px;
      background: var(--th-surface-2);
      border: 1px solid var(--th-border);
      border-radius: 10px;
      flex-wrap: wrap;
    }
    .bulk-toolbar__select-all {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: var(--th-text-secondary);
      cursor: pointer;
      user-select: none;
    }
    .bulk-toolbar__select-all input[type="checkbox"] {
      width: 16px;
      height: 16px;
      accent-color: var(--th-primary);
      cursor: pointer;
    }
    .bulk-toolbar__sep {
      width: 1px;
      height: 20px;
      background: var(--th-border-strong);
    }
    .bulk-toolbar__count {
      font-size: 13px;
      font-weight: 600;
      color: var(--th-primary);
    }
    .bulk-toolbar__actions {
      display: flex;
      gap: 8px;
      margin-left: auto;
    }
    .bulk-btn {
      height: 34px;
      padding: 0 14px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      border: 1px solid transparent;
      transition: all 0.15s;
    }
    .bulk-btn--approve {
      background: var(--th-success);
      color: #fff;
      border-color: var(--th-success);
    }
    .bulk-btn--approve:hover:not(:disabled) {
      filter: brightness(0.9);
    }
    .bulk-btn--reject {
      background: var(--th-danger);
      color: #fff;
      border-color: var(--th-danger);
    }
    .bulk-btn--reject:hover:not(:disabled) {
      filter: brightness(0.9);
    }
    .bulk-btn:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }
    .bulk-toolbar__clear {
      font-size: 12px;
      color: var(--th-muted);
      background: none;
      border: none;
      cursor: pointer;
      text-decoration: underline;
      padding: 0;
    }
    .bulk-toolbar__clear:hover {
      color: var(--th-text);
    }
    .cl-view-toggle {
      display: flex;
      border: 1px solid var(--th-border-strong, #d1d5db);
      border-radius: 8px;
      overflow: hidden;
    }
    .cl-view-toggle button {
      background: var(--th-surface-2, #f9fafb);
      border: none;
      padding: .3rem .6rem;
      color: var(--th-text-muted, #9ca3af);
      cursor: pointer;
      font-size: .9rem;
      transition: background .15s, color .15s;
    }
    .cl-view-toggle button.active { background: var(--th-primary, #6366f1); color: #fff; }
    .cl-view-toggle button:not(.active):hover { background: var(--th-surface, #fff); color: var(--th-text, #111); }
    .btn-xs { padding: .2rem .45rem; font-size: .75rem; }
  `],
  template: `
    <app-page-header
      title="Requests"
      [subtitle]="activeSection === 'edit' ? (editPagination.total + ' edit requests') : (contactPagination.total + ' contact requests')"
      icon="bi-inbox-fill"
    />

    <!-- Section toggle -->
    <div class="req-section-toggle mb-4">
      <button class="req-section-btn"
        [class.active]="activeSection === 'edit'"
        (click)="setSection('edit')">
        <i class="bi bi-pencil-square"></i>
        Candidate Edit Requests
        @if (editPendingCount > 0) {
          <span class="req-section-badge">{{ editPendingCount }}</span>
        }
      </button>
      <button class="req-section-btn"
        [class.active]="activeSection === 'contact'"
        (click)="setSection('contact')">
        <i class="bi bi-person-lines-fill"></i>
        Contact Info Requests
        @if (contactPendingCount > 0) {
          <span class="req-section-badge">{{ contactPendingCount }}</span>
        }
      </button>
    </div>

    <!-- ── EDIT REQUESTS SECTION ── -->
    @if (activeSection === 'edit') {

      <!-- Filter bar -->
      <div class="filter-bar">
        <div class="filter-bar__row">

          <!-- Search -->
          <div class="filter-bar__group filter-bar__group--wide">
            <span class="filter-bar__label"><i class="bi bi-search me-1"></i>Search candidate</span>
            <input
              class="filter-bar__input"
              type="text"
              placeholder="Search by candidate name…"
              [(ngModel)]="editSearch"
              (ngModelChange)="onEditSearchChange($event)"
            />
          </div>

          <!-- Request Type -->
          <div class="filter-bar__group">
            <span class="filter-bar__label"><i class="bi bi-tag me-1"></i>Request type</span>
            <select class="filter-bar__select" [(ngModel)]="editRequestType" (ngModelChange)="onEditFilterChange()">
              <option value="">All types</option>
              <option value="personal">Personal Info</option>
              <option value="professional">Professional</option>
              <option value="location">Location</option>
              <option value="salary">Salary</option>
              <option value="skills">Skills</option>
              <option value="languages">Languages</option>
              <option value="experience">Experience</option>
              <option value="education">Education</option>
            </select>
          </div>

          <!-- Date From -->
          <div class="filter-bar__group">
            <span class="filter-bar__label"><i class="bi bi-calendar me-1"></i>Date from</span>
            <input
              class="filter-bar__input"
              type="date"
              [(ngModel)]="editDateFrom"
              (ngModelChange)="onEditFilterChange()"
            />
          </div>

          <!-- Date To -->
          <div class="filter-bar__group">
            <span class="filter-bar__label"><i class="bi bi-calendar-check me-1"></i>Date to</span>
            <input
              class="filter-bar__input"
              type="date"
              [(ngModel)]="editDateTo"
              (ngModelChange)="onEditFilterChange()"
            />
          </div>

          <!-- Sort -->
          <div class="filter-bar__group" style="flex:0 1 140px;min-width:120px">
            <span class="filter-bar__label"><i class="bi bi-sort-down me-1"></i>Sort</span>
            <select class="filter-bar__select" [(ngModel)]="editSort" (ngModelChange)="onEditFilterChange()">
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
            </select>
          </div>

          <!-- View toggle + Export -->
          <div style="display:flex;align-items:flex-end;gap:6px;margin-left:auto">
            <div class="cl-view-toggle" style="align-self:flex-end">
              <button [class.active]="editViewMode === 'card'" (click)="editViewMode = 'card'" title="Card view"><i class="bi bi-grid-3x3-gap-fill"></i></button>
              <button [class.active]="editViewMode === 'list'" (click)="editViewMode = 'list'" title="List view"><i class="bi bi-list-ul"></i></button>
            </div>
            <button class="filter-bar__clear" style="border-color:var(--th-success);color:var(--th-success)"
              [disabled]="editExporting" (click)="exportEditCsv()">
              @if (editExporting) { <span class="spinner-border spinner-border-sm"></span> }
              @else { <i class="bi bi-download"></i> }
              Export CSV
            </button>
          </div>

          <!-- Clear filters -->
          @if (editActiveFilterCount > 0) {
            <button class="filter-bar__clear" (click)="clearEditFilters()">
              <i class="bi bi-x-lg"></i>
              Clear
              <span class="filter-bar__active-badge">{{ editActiveFilterCount }}</span>
            </button>
          }
        </div>
      </div>

      <!-- Status filter tabs -->
      <div class="nav-pills-custom mb-4">
        @for (tab of statusTabs; track tab.value) {
          <button class="nav-pill"
            [class.active]="editStatus === tab.value"
            (click)="setEditStatus(tab.value)">
            {{ tab.label }}
            <span class="nav-pill__count">{{ editTabCount(tab.value) }}</span>
          </button>
        }
      </div>

      <!-- Bulk toolbar (visible only on pending tab) -->
      @if (editStatus === 'pending' && !editLoading && editRequests.length > 0) {
        <div class="bulk-toolbar">
          <label class="bulk-toolbar__select-all">
            <input
              type="checkbox"
              [checked]="editAllSelected"
              [indeterminate]="editSelectedIds.size > 0 && !editAllSelected"
              (change)="toggleSelectAllEdit($event)"
            />
            Select all on page
          </label>
          @if (editSelectedIds.size > 0) {
            <div class="bulk-toolbar__sep"></div>
            <span class="bulk-toolbar__count">{{ editSelectedIds.size }} selected</span>
            <div class="bulk-toolbar__actions">
              <button class="bulk-btn bulk-btn--approve" [disabled]="bulkSubmitting" (click)="bulkActionEdit('approved')">
                <i class="bi bi-check-circle"></i>
                Approve Selected
              </button>
              <button class="bulk-btn bulk-btn--reject" [disabled]="bulkSubmitting" (click)="bulkActionEdit('rejected')">
                <i class="bi bi-x-circle"></i>
                Reject Selected
              </button>
            </div>
            <button class="bulk-toolbar__clear" (click)="clearEditSelection()">Clear</button>
          }
        </div>
      }

      @if (editLoading) {
        <div class="loading-state">
          <div class="spinner-border"></div>
          <div class="loading-state__text">Loading requests…</div>
        </div>
      } @else if (editRequests.length === 0) {
        <app-empty-state
          icon="bi-inbox"
          [title]="editEmptyTitle"
          [subtitle]="editActiveFilterCount > 0 ? 'No results match your current filters. Try adjusting your search.' : editEmptySubtitle"
        />
      } @else {
        @if (editViewMode === 'card') {
          <div class="row g-3">
            @for (req of editRequests; track req.id) {
              <div class="col-xxl-3 col-lg-4 col-md-6 col-12">
                <app-edit-request-card
                  [request]="req"
                  [isAdmin]="true"
                  [isRecruiter]="false"
                  [selectable]="editStatus === 'pending'"
                  [selected]="editSelectedIds.has(req.id)"
                  (selectionChange)="onEditSelectionChange(req.id, $event)"
                  (approved)="onEditApproved($event)"
                  (rejected)="onEditRejected($event)"
                  (cancelled)="onEditReviewCancelled()">
                </app-edit-request-card>
              </div>
            }
          </div>
        } @else {
          <!-- List (table) view -->
          <div class="table-responsive">
            <table class="table table-hover align-middle mb-0">
              <thead class="table-light">
                <tr>
                  @if (editStatus === 'pending') {
                    <th style="width:36px">
                      <input type="checkbox" [checked]="editAllSelected"
                        [indeterminate]="editSelectedIds.size > 0 && !editAllSelected"
                        (change)="toggleSelectAllEdit($event)" style="accent-color:var(--th-primary)">
                    </th>
                  }
                  <th>Candidate</th>
                  <th>Email</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th>Reviewed By</th>
                  <th class="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (req of editRequests; track req.id) {
                  <tr>
                    @if (editStatus === 'pending') {
                      <td>
                        <input type="checkbox" [checked]="editSelectedIds.has(req.id)"
                          (change)="onEditSelectionChange(req.id, $any($event.target).checked)"
                          style="accent-color:var(--th-primary)">
                      </td>
                    }
                    <td>
                      <div class="fw-semibold small">{{ req.first_name }} {{ req.last_name }}</div>
                    </td>
                    <td class="small text-muted">{{ req.email }}</td>
                    <td class="small">{{ req.reason || '—' }}</td>
                    <td>
                      @if (req.status === 'pending') {
                        <span class="badge bg-warning-subtle text-warning border border-warning-subtle" style="font-size:.7rem">Pending</span>
                      } @else if (req.status === 'approved') {
                        <span class="badge bg-success-subtle text-success border border-success-subtle" style="font-size:.7rem">Approved</span>
                      } @else {
                        <span class="badge bg-danger-subtle text-danger border border-danger-subtle" style="font-size:.7rem">Rejected</span>
                      }
                    </td>
                    <td class="small text-muted">{{ req.created_at | date:'dd MMM yyyy' }}</td>
                    <td class="small text-muted">{{ req.reviewed_by_name || '—' }}</td>
                    <td class="text-end">
                      @if (req.status === 'pending') {
                        <div class="d-flex justify-content-end gap-1">
                          <button class="btn btn-xs btn-success" (click)="onEditApproved({ id: req.id })">
                            <i class="bi bi-check"></i>
                          </button>
                          <button class="btn btn-xs btn-danger" (click)="onEditRejected({ id: req.id })">
                            <i class="bi bi-x"></i>
                          </button>
                        </div>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }

        @if (editPagination.pages > 1) {
          <nav class="mt-4 d-flex justify-content-center">
            <ul class="pagination pagination-sm mb-0">
              <li class="page-item" [class.disabled]="editPagination.page === 1">
                <button class="page-link" (click)="goToEditPage(editPagination.page - 1)">«</button>
              </li>
              @for (pg of editPageNumbers(); track pg) {
                <li class="page-item" [class.active]="pg === editPagination.page">
                  <button class="page-link" (click)="goToEditPage(pg)">{{ pg }}</button>
                </li>
              }
              <li class="page-item" [class.disabled]="editPagination.page === editPagination.pages">
                <button class="page-link" (click)="goToEditPage(editPagination.page + 1)">»</button>
              </li>
            </ul>
          </nav>
        }
      }
    }

    <!-- ── CONTACT REQUESTS SECTION ── -->
    @if (activeSection === 'contact') {

      <!-- Filter bar -->
      <div class="filter-bar">
        <div class="filter-bar__row">

          <!-- Search -->
          <div class="filter-bar__group filter-bar__group--wide">
            <span class="filter-bar__label"><i class="bi bi-search me-1"></i>Search</span>
            <input
              class="filter-bar__input"
              type="text"
              placeholder="Search by recruiter or candidate name…"
              [(ngModel)]="contactSearch"
              (ngModelChange)="onContactSearchChange($event)"
            />
          </div>

          <!-- Date From -->
          <div class="filter-bar__group">
            <span class="filter-bar__label"><i class="bi bi-calendar me-1"></i>Date from</span>
            <input
              class="filter-bar__input"
              type="date"
              [(ngModel)]="contactDateFrom"
              (ngModelChange)="onContactFilterChange()"
            />
          </div>

          <!-- Date To -->
          <div class="filter-bar__group">
            <span class="filter-bar__label"><i class="bi bi-calendar-check me-1"></i>Date to</span>
            <input
              class="filter-bar__input"
              type="date"
              [(ngModel)]="contactDateTo"
              (ngModelChange)="onContactFilterChange()"
            />
          </div>

          <!-- Sort -->
          <div class="filter-bar__group" style="flex:0 1 140px;min-width:120px">
            <span class="filter-bar__label"><i class="bi bi-sort-down me-1"></i>Sort</span>
            <select class="filter-bar__select" [(ngModel)]="contactSort" (ngModelChange)="onContactFilterChange()">
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
            </select>
          </div>

          <!-- View toggle + Export -->
          <div style="display:flex;align-items:flex-end;gap:6px;margin-left:auto">
            <div class="cl-view-toggle" style="align-self:flex-end">
              <button [class.active]="contactViewMode === 'card'" (click)="contactViewMode = 'card'" title="Card view"><i class="bi bi-grid-3x3-gap-fill"></i></button>
              <button [class.active]="contactViewMode === 'list'" (click)="contactViewMode = 'list'" title="List view"><i class="bi bi-list-ul"></i></button>
            </div>
            <button class="filter-bar__clear" style="border-color:var(--th-success);color:var(--th-success)"
              [disabled]="contactExporting" (click)="exportContactCsv()">
              @if (contactExporting) { <span class="spinner-border spinner-border-sm"></span> }
              @else { <i class="bi bi-download"></i> }
              Export CSV
            </button>
          </div>

          <!-- Clear filters -->
          @if (contactActiveFilterCount > 0) {
            <button class="filter-bar__clear" (click)="clearContactFilters()">
              <i class="bi bi-x-lg"></i>
              Clear
              <span class="filter-bar__active-badge">{{ contactActiveFilterCount }}</span>
            </button>
          }
        </div>
      </div>

      <!-- Status filter tabs -->
      <div class="nav-pills-custom mb-4">
        @for (tab of statusTabs; track tab.value) {
          <button class="nav-pill"
            [class.active]="contactStatus === tab.value"
            (click)="setContactStatus(tab.value)">
            {{ tab.label }}
            <span class="nav-pill__count">{{ contactTabCount(tab.value) }}</span>
          </button>
        }
      </div>

      <!-- Bulk toolbar (visible only on pending tab) -->
      @if (contactStatus === 'pending' && !contactLoading && contactRequests.length > 0) {
        <div class="bulk-toolbar">
          <label class="bulk-toolbar__select-all">
            <input
              type="checkbox"
              [checked]="contactAllSelected"
              [indeterminate]="contactSelectedIds.size > 0 && !contactAllSelected"
              (change)="toggleSelectAllContact($event)"
            />
            Select all on page
          </label>
          @if (contactSelectedIds.size > 0) {
            <div class="bulk-toolbar__sep"></div>
            <span class="bulk-toolbar__count">{{ contactSelectedIds.size }} selected</span>
            <div class="bulk-toolbar__actions">
              <button class="bulk-btn bulk-btn--approve" [disabled]="bulkSubmitting" (click)="bulkActionContact('approved')">
                <i class="bi bi-check-circle"></i>
                Approve Selected
              </button>
              <button class="bulk-btn bulk-btn--reject" [disabled]="bulkSubmitting" (click)="bulkActionContact('rejected')">
                <i class="bi bi-x-circle"></i>
                Reject Selected
              </button>
            </div>
            <button class="bulk-toolbar__clear" (click)="clearContactSelection()">Clear</button>
          }
        </div>
      }

      @if (contactLoading) {
        <div class="loading-state">
          <div class="spinner-border"></div>
          <div class="loading-state__text">Loading requests…</div>
        </div>
      } @else if (contactRequests.length === 0) {
        <app-empty-state
          icon="bi-person-lines-fill"
          [title]="contactEmptyTitle"
          [subtitle]="contactActiveFilterCount > 0 ? 'No results match your current filters. Try adjusting your search.' : contactEmptySubtitle"
        />
      } @else {
        @if (contactViewMode === 'card') {
          <div class="row g-3">
            @for (req of contactRequests; track req.id) {
              <div class="col-xxl-3 col-lg-4 col-md-6 col-12">
                <app-contact-request-card
                  [request]="req"
                  [isAdmin]="true"
                  [isRecruiter]="false"
                  [selectable]="contactStatus === 'pending'"
                  [selected]="contactSelectedIds.has(req.id)"
                  (selectionChange)="onContactSelectionChange(req.id, $event)"
                  (approved)="onContactApproved($event)"
                  (rejected)="onContactRejected($event)"
                  (cancelled)="onContactReviewCancelled()">
                </app-contact-request-card>
              </div>
            }
          </div>
        } @else {
          <!-- List (table) view -->
          <div class="table-responsive">
            <table class="table table-hover align-middle mb-0">
              <thead class="table-light">
                <tr>
                  @if (contactStatus === 'pending') {
                    <th style="width:36px">
                      <input type="checkbox" [checked]="contactAllSelected"
                        [indeterminate]="contactSelectedIds.size > 0 && !contactAllSelected"
                        (change)="toggleSelectAllContact($event)" style="accent-color:var(--th-primary)">
                    </th>
                  }
                  <th>Candidate / Requester</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th>Reviewed By</th>
                  <th class="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (req of contactRequests; track req.id) {
                  <tr>
                    @if (contactStatus === 'pending') {
                      <td>
                        <input type="checkbox" [checked]="contactSelectedIds.has(req.id)"
                          (change)="onContactSelectionChange(req.id, $any($event.target).checked)"
                          style="accent-color:var(--th-primary)">
                      </td>
                    }
                    <td class="fw-semibold small">{{ (req.candidate_first_name ? req.candidate_first_name + ' ' + req.candidate_last_name : null) ?? req.recruiter_name ?? '—' }}</td>
                    <td>
                      @if (req.status === 'pending') {
                        <span class="badge bg-warning-subtle text-warning border border-warning-subtle" style="font-size:.7rem">Pending</span>
                      } @else if (req.status === 'approved') {
                        <span class="badge bg-success-subtle text-success border border-success-subtle" style="font-size:.7rem">Approved</span>
                      } @else {
                        <span class="badge bg-danger-subtle text-danger border border-danger-subtle" style="font-size:.7rem">Rejected</span>
                      }
                    </td>
                    <td class="small text-muted">{{ req.created_at | date:'dd MMM yyyy' }}</td>
                    <td class="small text-muted">{{ req.reviewed_by_name || '—' }}</td>
                    <td class="text-end">
                      @if (req.status === 'pending') {
                        <div class="d-flex justify-content-end gap-1">
                          <button class="btn btn-xs btn-success" (click)="onContactApproved({ id: req.id })">
                            <i class="bi bi-check"></i>
                          </button>
                          <button class="btn btn-xs btn-danger" (click)="onContactRejected({ id: req.id })">
                            <i class="bi bi-x"></i>
                          </button>
                        </div>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }

        @if (contactPagination.pages > 1) {
          <nav class="mt-4 d-flex justify-content-center">
            <ul class="pagination pagination-sm mb-0">
              <li class="page-item" [class.disabled]="contactPagination.page === 1">
                <button class="page-link" (click)="goToContactPage(contactPagination.page - 1)">«</button>
              </li>
              @for (pg of contactPageNumbers(); track pg) {
                <li class="page-item" [class.active]="pg === contactPagination.page">
                  <button class="page-link" (click)="goToContactPage(pg)">{{ pg }}</button>
                </li>
              }
              <li class="page-item" [class.disabled]="contactPagination.page === contactPagination.pages">
                <button class="page-link" (click)="goToContactPage(contactPagination.page + 1)">»</button>
              </li>
            </ul>
          </nav>
        }
      }
    }
  `,
})
export class EditRequestsComponent implements OnInit, OnDestroy {
  activeSection: 'edit' | 'contact' = 'edit';

  // Edit requests state
  editRequests: EditRequest[] = [];
  editPagination = { page: 1, limit: 10, total: 0, pages: 0 };
  editLoading = false;
  editStatus = 'pending';
  editReviewingId: string | null = null;
  editPendingCount = 0;

  // Edit filter state
  editSearch = '';
  editDateFrom = '';
  editDateTo = '';
  editRequestType: EditRequestType | '' = '';
  editSort: 'newest' | 'oldest' = 'newest';
  editViewMode: 'card' | 'list' = 'card';
  editExporting = false;

  // Edit bulk selection
  editSelectedIds = new Set<string>();

  // Edit tab counts
  editCounts: EditRequestCounts = { pending: 0, approved: 0, rejected: 0, total: 0 };

  // Contact requests state
  contactRequests: ContactRequest[] = [];
  contactPagination = { page: 1, limit: 10, total: 0, pages: 0 };
  contactLoading = false;
  contactStatus = 'pending';
  contactReviewingId: string | null = null;
  contactPendingCount = 0;

  // Contact filter state
  contactSearch = '';
  contactDateFrom = '';
  contactDateTo = '';
  contactSort: 'newest' | 'oldest' = 'newest';
  contactViewMode: 'card' | 'list' = 'card';
  contactExporting = false;

  // Contact bulk selection
  contactSelectedIds = new Set<string>();

  // Contact tab counts
  contactCounts: ContactRequestCounts = { pending: 0, approved: 0, rejected: 0, total: 0 };

  // Shared
  reviewForm: FormGroup;
  reviewSubmitting = false;
  bulkSubmitting = false;

  statusTabs = [
    { label: 'Pending',  value: 'pending'  },
    { label: 'Approved', value: 'approved' },
    { label: 'Rejected', value: 'rejected' },
    { label: 'All',      value: ''         },
  ];

  // Debounce subjects
  private editSearch$    = new Subject<string>();
  private contactSearch$ = new Subject<string>();
  private destroy$       = new Subject<void>();

  private readonly fieldLabels: Record<string, string> = {
    first_name: 'First Name', last_name: 'Last Name', phone: 'Phone',
    date_of_birth: 'Date of Birth', gender: 'Gender', bio: 'Bio',
    linkedin_url: 'LinkedIn', job_title: 'Job Title', occupation: 'Occupation',
    industry: 'Industry', years_experience: 'Yrs Experience',
    current_country: 'Country', current_city: 'City', nationality: 'Nationality',
    salary_min: 'Salary Min', salary_max: 'Salary Max',
    salary_currency: 'Currency', salary_type: 'Salary Type',
    skills: 'Skills', languages: 'Languages',
    experience: 'Work Experience', education: 'Education',
  };

  constructor(
    private fb: FormBuilder,
    private editRequestService: EditRequestService,
    private contactRequestService: ContactRequestService,
    private toast: ToastService,
    private confirmDialog: ConfirmDialogService,
  ) {
    this.reviewForm = this.fb.group({ admin_note: [''] });
  }

  ngOnInit(): void {
    this.editSearch$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$),
    ).subscribe(() => {
      this.editPagination.page = 1;
      this.loadEditRequests();
    });

    this.contactSearch$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$),
    ).subscribe(() => {
      this.contactPagination.page = 1;
      this.loadContactRequests();
    });

    this.loadEditRequests();
    this.loadContactRequests();
    this.refreshEditCounts();
    this.refreshContactCounts();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Section toggle ─────────────────────────────────────────────────────────

  refreshEditCounts(): void {
    this.editRequestService.getCounts().subscribe({
      next: (c) => (this.editCounts = c),
      error: () => { /* non-fatal */ },
    });
  }

  refreshContactCounts(): void {
    this.contactRequestService.getCounts().subscribe({
      next: (c) => (this.contactCounts = c),
      error: () => { /* non-fatal */ },
    });
  }

  editTabCount(value: string): number {
    if (value === 'pending')  return this.editCounts.pending;
    if (value === 'approved') return this.editCounts.approved;
    if (value === 'rejected') return this.editCounts.rejected;
    return this.editCounts.total;
  }

  contactTabCount(value: string): number {
    if (value === 'pending')  return this.contactCounts.pending;
    if (value === 'approved') return this.contactCounts.approved;
    if (value === 'rejected') return this.contactCounts.rejected;
    return this.contactCounts.total;
  }

  get editEmptyTitle(): string {
    if (this.editStatus === 'pending')  return 'No pending requests — all caught up!';
    if (this.editStatus === 'approved') return 'No approved requests yet';
    if (this.editStatus === 'rejected') return 'No rejected requests yet';
    return 'No edit requests found';
  }

  get editEmptySubtitle(): string {
    if (this.editStatus === '') return 'Requests submitted by candidates and recruiters will appear here.';
    return '';
  }

  get contactEmptyTitle(): string {
    if (this.contactStatus === 'pending')  return 'No pending requests — all caught up!';
    if (this.contactStatus === 'approved') return 'No approved requests yet';
    if (this.contactStatus === 'rejected') return 'No rejected requests yet';
    return 'No contact requests found';
  }

  get contactEmptySubtitle(): string {
    if (this.contactStatus === '') return 'Requests submitted by candidates and recruiters will appear here.';
    return '';
  }

  setSection(section: 'edit' | 'contact'): void {
    this.activeSection = section;
    this.cancelReview();
    this.editSelectedIds   = new Set();
    this.contactSelectedIds = new Set();
  }

  // ── Edit filter helpers ────────────────────────────────────────────────────

  get editActiveFilterCount(): number {
    return [this.editSearch, this.editDateFrom, this.editDateTo, this.editRequestType]
      .filter(v => !!v).length;
  }

  onEditSearchChange(value: string): void {
    this.editSearch$.next(value);
  }

  onEditFilterChange(): void {
    this.editPagination.page = 1;
    this.loadEditRequests();
  }

  clearEditFilters(): void {
    this.editSearch      = '';
    this.editDateFrom    = '';
    this.editDateTo      = '';
    this.editRequestType = '';
    this.editSort        = 'newest';
    this.editPagination.page = 1;
    this.loadEditRequests();
  }

  // ── Contact filter helpers ─────────────────────────────────────────────────

  get contactActiveFilterCount(): number {
    return [this.contactSearch, this.contactDateFrom, this.contactDateTo]
      .filter(v => !!v).length;
  }

  onContactSearchChange(value: string): void {
    this.contactSearch$.next(value);
  }

  onContactFilterChange(): void {
    this.contactPagination.page = 1;
    this.loadContactRequests();
  }

  clearContactFilters(): void {
    this.contactSearch   = '';
    this.contactDateFrom = '';
    this.contactDateTo   = '';
    this.contactSort     = 'newest';
    this.contactPagination.page = 1;
    this.loadContactRequests();
  }

  // ── Edit bulk selection ────────────────────────────────────────────────────

  get editAllSelected(): boolean {
    const pending = this.editRequests.filter(r => r.status === 'pending');
    return pending.length > 0 && pending.every(r => this.editSelectedIds.has(r.id));
  }

  clearEditSelection(): void {
    this.editSelectedIds = new Set();
  }

  onEditSelectionChange(id: string, checked: boolean): void {
    const next = new Set(this.editSelectedIds);
    checked ? next.add(id) : next.delete(id);
    this.editSelectedIds = next;
  }

  toggleSelectAllEdit(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const pending = this.editRequests.filter(r => r.status === 'pending').map(r => r.id);
    if (checked) {
      this.editSelectedIds = new Set([...this.editSelectedIds, ...pending]);
    } else {
      const next = new Set(this.editSelectedIds);
      pending.forEach(id => next.delete(id));
      this.editSelectedIds = next;
    }
  }

  bulkActionEdit(status: 'approved' | 'rejected'): void {
    const ids = Array.from(this.editSelectedIds);
    const verb = status === 'approved' ? 'approve' : 'reject';
    this.confirmDialog.confirm({
      title:        `Bulk ${status === 'approved' ? 'Approve' : 'Reject'} Requests?`,
      message:      `Are you sure you want to ${verb} ${ids.length} edit request${ids.length !== 1 ? 's' : ''}? This action cannot be undone.`,
      confirmLabel: status === 'approved' ? 'Approve All' : 'Reject All',
      cancelLabel:  'Cancel',
      confirmClass: status === 'approved' ? 'btn-success' : 'btn-danger',
      showNoteField: true,
      noteLabel:    'Admin Note (Optional — applied to all)',
      notePlaceholder: status === 'approved' ? 'Add notes about this approval…' : 'Explain why these requests are being rejected…',
    }).then(result => {
      if (!result.confirmed) return;
      this.bulkSubmitting = true;
      this.editRequestService.bulkReview(ids, status, result.notes).subscribe({
        next: (res) => {
          this.bulkSubmitting  = false;
          this.editSelectedIds = new Set();
          if (res.failed.length === 0) {
            this.toast.success(`${res.succeeded.length} request${res.succeeded.length !== 1 ? 's' : ''} ${status}`);
          } else {
            this.toast.error(`${res.succeeded.length} succeeded, ${res.failed.length} failed`);
          }
          this.loadEditRequests();
          this.refreshEditCounts();
        },
        error: (err) => {
          this.bulkSubmitting = false;
          this.toast.error(err?.error?.message ?? 'Bulk action failed');
        },
      });
    });
  }

  // ── Contact bulk selection ─────────────────────────────────────────────────

  get contactAllSelected(): boolean {
    const pending = this.contactRequests.filter(r => r.status === 'pending');
    return pending.length > 0 && pending.every(r => this.contactSelectedIds.has(r.id));
  }

  clearContactSelection(): void {
    this.contactSelectedIds = new Set();
  }

  onContactSelectionChange(id: string, checked: boolean): void {
    const next = new Set(this.contactSelectedIds);
    checked ? next.add(id) : next.delete(id);
    this.contactSelectedIds = next;
  }

  toggleSelectAllContact(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const pending = this.contactRequests.filter(r => r.status === 'pending').map(r => r.id);
    if (checked) {
      this.contactSelectedIds = new Set([...this.contactSelectedIds, ...pending]);
    } else {
      const next = new Set(this.contactSelectedIds);
      pending.forEach(id => next.delete(id));
      this.contactSelectedIds = next;
    }
  }

  bulkActionContact(status: 'approved' | 'rejected'): void {
    const ids = Array.from(this.contactSelectedIds);
    const verb = status === 'approved' ? 'approve' : 'reject';
    this.confirmDialog.confirm({
      title:        `Bulk ${status === 'approved' ? 'Approve' : 'Reject'} Requests?`,
      message:      `Are you sure you want to ${verb} ${ids.length} contact request${ids.length !== 1 ? 's' : ''}? This action cannot be undone.`,
      confirmLabel: status === 'approved' ? 'Approve All' : 'Reject All',
      cancelLabel:  'Cancel',
      confirmClass: status === 'approved' ? 'btn-success' : 'btn-danger',
      showNoteField: true,
      noteLabel:    'Admin Note (Optional — applied to all)',
      notePlaceholder: status === 'approved' ? 'Add notes about this approval…' : 'Explain why these requests are being rejected…',
    }).then(result => {
      if (!result.confirmed) return;
      this.bulkSubmitting = true;
      this.contactRequestService.bulkReview(ids, status, result.notes).subscribe({
        next: (res) => {
          this.bulkSubmitting     = false;
          this.contactSelectedIds = new Set();
          if (res.failed.length === 0) {
            this.toast.success(`${res.succeeded.length} request${res.succeeded.length !== 1 ? 's' : ''} ${status}`);
          } else {
            this.toast.error(`${res.succeeded.length} succeeded, ${res.failed.length} failed`);
          }
          this.loadContactRequests();
          this.refreshContactCounts();
        },
        error: (err) => {
          this.bulkSubmitting = false;
          this.toast.error(err?.error?.message ?? 'Bulk action failed');
        },
      });
    });
  }

  // ── Edit requests ──────────────────────────────────────────────────────────

  loadEditRequests(): void {
    this.editLoading = true;
    this.editRequestService.list({
      status:       (this.editStatus as any) || undefined,
      search:       this.editSearch       || undefined,
      date_from:    this.editDateFrom     || undefined,
      date_to:      this.editDateTo       || undefined,
      request_type: (this.editRequestType as EditRequestType) || undefined,
      sort:         this.editSort,
      page:         this.editPagination.page,
      limit:        this.editPagination.limit,
    }).subscribe({
      next: (res) => {
        this.editLoading    = false;
        this.editRequests   = res.data;
        this.editPagination = res.pagination;
        // Remove stale selections after page reload
        const ids = new Set(res.data.map((r: EditRequest) => r.id));
        this.editSelectedIds = new Set([...this.editSelectedIds].filter(id => ids.has(id)));
      },
      error: () => (this.editLoading = false),
    });
    this.editRequestService.list({ status: 'pending', page: 1, limit: 1 }).subscribe({
      next: (res) => (this.editPendingCount = res.pagination.total),
    });
  }

  setEditStatus(status: string): void {
    this.editStatus          = status;
    this.editPagination.page = 1;
    this.editSelectedIds     = new Set();
    this.loadEditRequests();
  }

  goToEditPage(page: number): void {
    if (page < 1 || page > this.editPagination.pages) return;
    this.editPagination.page = page;
    this.editSelectedIds     = new Set();
    this.loadEditRequests();
  }

  editPageNumbers(): number[] {
    return this._pageNumbers(this.editPagination);
  }

  getEditChanges(req: EditRequest): { key: string; label: string; display: string }[] {
    const data = req.requested_data ?? {};
    return Object.entries(data)
      .filter(([k]) => k !== 'id' && k !== 'user_id')
      .map(([k, v]) => ({
        key:     k,
        label:   this.fieldLabels[k] ?? k,
        display: Array.isArray(v) ? JSON.stringify(v) : String(v ?? '—'),
      }));
  }

  startEditReview(id: string): void { this.editReviewingId = id; this.reviewForm.reset(); }

  confirmEditReview(id: string, status: 'approved' | 'rejected'): void {
    this.reviewSubmitting = true;
    const admin_note = this.reviewForm.value.admin_note || undefined;
    this.editRequestService.review(id, { status, admin_note }).subscribe({
      next: () => {
        this.reviewSubmitting = false;
        this.editReviewingId  = null;
        this.toast.success(`Request ${status}`);
        this.loadEditRequests();
      },
      error: (err) => {
        this.reviewSubmitting = false;
        this.toast.error(err?.error?.message ?? 'Failed to review');
      },
    });
  }

  // ── Contact requests ────────────────────────────────────────────────────────

  loadContactRequests(): void {
    this.contactLoading = true;
    this.contactRequestService.list({
      status:    this.contactStatus || undefined,
      search:    this.contactSearch    || undefined,
      date_from: this.contactDateFrom  || undefined,
      date_to:   this.contactDateTo    || undefined,
      page:      this.contactPagination.page,
      limit:     this.contactPagination.limit,
    }).subscribe({
      next: (res) => {
        this.contactLoading    = false;
        this.contactRequests   = res.data;
        this.contactPagination = res.pagination;
        // Remove stale selections after page reload
        const ids = new Set(res.data.map((r: ContactRequest) => r.id));
        this.contactSelectedIds = new Set([...this.contactSelectedIds].filter(id => ids.has(id)));
      },
      error: () => (this.contactLoading = false),
    });
    this.contactRequestService.list({ status: 'pending', page: 1, limit: 1 }).subscribe({
      next: (res) => (this.contactPendingCount = res.pagination.total),
    });
  }

  setContactStatus(status: string): void {
    this.contactStatus          = status;
    this.contactPagination.page = 1;
    this.contactSelectedIds     = new Set();
    this.loadContactRequests();
  }

  goToContactPage(page: number): void {
    if (page < 1 || page > this.contactPagination.pages) return;
    this.contactPagination.page = page;
    this.contactSelectedIds     = new Set();
    this.loadContactRequests();
  }

  contactPageNumbers(): number[] {
    return this._pageNumbers(this.contactPagination);
  }

  startContactReview(id: string): void { this.contactReviewingId = id; this.reviewForm.reset(); }

  confirmContactReview(id: string, status: 'approved' | 'rejected'): void {
    this.reviewSubmitting    = true;
    const admin_note = this.reviewForm.value.admin_note || undefined;
    this.contactRequestService.review(id, { status, admin_note }).subscribe({
      next: () => {
        this.reviewSubmitting    = false;
        this.contactReviewingId  = null;
        this.toast.success(`Request ${status}`);
        this.loadContactRequests();
      },
      error: (err) => {
        this.reviewSubmitting = false;
        this.toast.error(err?.error?.message ?? 'Failed to review');
      },
    });
  }

  onEditApproved(event: { id: string; adminNote?: string }): void {
    this.reviewSubmitting = true;
    this.editRequestService.review(event.id, { status: 'approved', admin_note: event.adminNote }).subscribe({
      next: () => {
        this.reviewSubmitting = false;
        this.toast.success('Request approved');
        this.loadEditRequests();
        this.refreshEditCounts();
      },
      error: (err) => {
        this.reviewSubmitting = false;
        this.toast.error(err?.error?.message ?? 'Failed to review');
      },
    });
  }

  onEditRejected(event: { id: string; adminNote?: string }): void {
    this.reviewSubmitting = true;
    this.editRequestService.review(event.id, { status: 'rejected', admin_note: event.adminNote }).subscribe({
      next: () => {
        this.reviewSubmitting = false;
        this.toast.success('Request rejected');
        this.loadEditRequests();
        this.refreshEditCounts();
      },
      error: (err) => {
        this.reviewSubmitting = false;
        this.toast.error(err?.error?.message ?? 'Failed to review');
      },
    });
  }

  onEditReviewCancelled(): void {
    this.reviewSubmitting = false;
  }

  onContactApproved(event: { id: string; adminNote?: string }): void {
    this.reviewSubmitting = true;
    this.contactRequestService.review(event.id, { status: 'approved', admin_note: event.adminNote }).subscribe({
      next: () => {
        this.reviewSubmitting = false;
        this.toast.success('Request approved');
        this.loadContactRequests();
        this.refreshContactCounts();
      },
      error: (err) => {
        this.reviewSubmitting = false;
        this.toast.error(err?.error?.message ?? 'Failed to review');
      },
    });
  }

  onContactRejected(event: { id: string; adminNote?: string }): void {
    this.reviewSubmitting = true;
    this.contactRequestService.review(event.id, { status: 'rejected', admin_note: event.adminNote }).subscribe({
      next: () => {
        this.reviewSubmitting = false;
        this.toast.success('Request rejected');
        this.loadContactRequests();
        this.refreshContactCounts();
      },
      error: (err) => {
        this.reviewSubmitting = false;
        this.toast.error(err?.error?.message ?? 'Failed to review');
      },
    });
  }

  onContactReviewCancelled(): void {
    this.reviewSubmitting = false;
  }

  // ── Shared ────────────────────────────────────────────────────────────────

  exportEditCsv(): void {
    this.editExporting = true;
    this.editRequestService.exportCsv({
      status:       (this.editStatus as any) || undefined,
      search:       this.editSearch       || undefined,
      date_from:    this.editDateFrom     || undefined,
      date_to:      this.editDateTo       || undefined,
      request_type: (this.editRequestType as EditRequestType) || undefined,
      sort:         this.editSort,
    }).subscribe({
      next: (blob) => {
        this.editExporting = false;
        const url = URL.createObjectURL(blob);
        const a   = document.createElement('a');
        a.href    = url;
        a.download = `edit-requests-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => { this.editExporting = false; this.toast.error('Export failed'); },
    });
  }

  exportContactCsv(): void {
    this.contactExporting = true;
    this.editRequestService.exportCsv({
      search:    this.contactSearch    || undefined,
      date_from: this.contactDateFrom  || undefined,
      date_to:   this.contactDateTo    || undefined,
      sort:      this.contactSort,
    }).subscribe({
      next: (blob) => {
        this.contactExporting = false;
        const url = URL.createObjectURL(blob);
        const a   = document.createElement('a');
        a.href    = url;
        a.download = `contact-requests-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => { this.contactExporting = false; this.toast.error('Export failed'); },
    });
  }

  cancelReview(): void {
    this.editReviewingId    = null;
    this.contactReviewingId = null;
  }

  private _pageNumbers(p: { page: number; pages: number }): number[] {
    const start = Math.max(1, p.page - 2);
    const end   = Math.min(p.pages, p.page + 2);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }
}
