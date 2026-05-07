// src/app/features/admin/volunteers/volunteer-list.component.ts
import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { VolunteerService, VolunteerFilters } from '../../../core/services/volunteer.service';
import { MasterDataService } from '../../../core/services/master-data.service';
import { Volunteer } from '../../../core/models/volunteer.model';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-volunteer-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, PageHeaderComponent, EmptyStateComponent],
  template: `
    <app-page-header
      title="Volunteers"
      [subtitle]="pagination.total + ' volunteer' + (pagination.total !== 1 ? 's' : '')"
      icon="bi-people-fill">
      <button class="btn btn-primary btn-sm" routerLink="/admin/volunteers/create">
        <i class="bi bi-person-plus me-1"></i>Add Volunteer
      </button>
    </app-page-header>

    <!-- ── Top Bar ─────────────────────────────────────────────────── -->
    <div class="cfs-topbar mb-3">

      <!-- Search -->
      <div class="cfs-search-wrap">
        <i class="bi bi-search cfs-search-icon"></i>
        <input type="text" class="cfs-search-input" [formControl]="searchCtrl"
          placeholder="Search name, role, email…"
          (keydown.enter)="applySearch()">
        <button class="cfs-search-btn" (click)="applySearch()">Search</button>
      </div>

      <!-- Sort -->
      <select class="form-select form-select-sm" style="width:180px" [formControl]="sortCtrl" (change)="onSortChange()">
        <option value="newest">Newest First</option>
        <option value="oldest">Oldest First</option>
        <option value="most_helpful">Most Helpful</option>
        <option value="name_asc">Name A–Z</option>
      </select>

      <!-- Filters toggle -->
      <button class="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
        (click)="advOpen = !advOpen">
        <i class="bi bi-funnel"></i> Filters
        @if (activeAdvCount > 0) {
          <span class="badge bg-primary rounded-pill">{{ activeAdvCount }}</span>
        }
      </button>

      <!-- Export CSV -->
      <button class="btn btn-sm btn-outline-success d-flex align-items-center gap-1"
        [disabled]="exporting" (click)="exportCsv()">
        @if (exporting) {
          <span class="spinner-border spinner-border-sm"></span>
        } @else {
          <i class="bi bi-download"></i>
        }
        Export CSV
      </button>

      <!-- View toggle -->
      <div class="cl-view-toggle">
        <button [class.active]="viewMode === 'list'" (click)="viewMode = 'list'" title="List view">
          <i class="bi bi-list-ul"></i>
        </button>
        <button [class.active]="viewMode === 'grid'" (click)="viewMode = 'grid'" title="Grid view">
          <i class="bi bi-grid-3x3-gap-fill"></i>
        </button>
      </div>

      <!-- Clear all -->
      @if (hasAnyFilter) {
        <button class="btn btn-sm btn-link text-danger p-0" (click)="clearFilters()">
          <i class="bi bi-x-lg me-1"></i>Clear All
        </button>
      }
    </div>

    <!-- ── Advanced Filter Panel ────────────────────────────────────── -->
    @if (advOpen) {
      <div class="filter-card mb-3">
        <form [formGroup]="filterForm">
          <div class="row g-3">

            <div class="col-md-4">
              <label class="form-label fw-semibold small">Country Placed In</label>
              <select formControlName="country_placed" class="form-select form-select-sm">
                <option value="">All countries</option>
                @for (c of countryNames(); track c) {
                  <option [value]="c">{{ c }}</option>
                }
              </select>
            </div>

            <div class="col-md-4">
              <label class="form-label fw-semibold small">Language Spoken</label>
              <select formControlName="language" class="form-select form-select-sm">
                <option value="">All languages</option>
                @for (l of languageNames(); track l) {
                  <option [value]="l">{{ l }}</option>
                }
              </select>
            </div>

            <div class="col-md-4">
              <label class="form-label fw-semibold small">Availability</label>
              <select formControlName="availability" class="form-select form-select-sm">
                <option value="">All</option>
                <option value="Active">Active</option>
                <option value="Temporarily Unavailable">Temporarily Unavailable</option>
              </select>
            </div>

          </div>

          <div class="d-flex gap-2 mt-3">
            <button type="button" class="btn btn-sm btn-primary" (click)="applyFilters()">
              <i class="bi bi-funnel-fill me-1"></i>Apply Filters
            </button>
            <button type="button" class="btn btn-sm btn-outline-secondary" (click)="clearFilters()">
              <i class="bi bi-x-lg me-1"></i>Clear All
            </button>
          </div>
        </form>
      </div>
    }

    <!-- ── Loading ──────────────────────────────────────────────────── -->
    @if (loading) {
      <div class="loading-state">
        <div class="spinner-border"></div>
        <div class="loading-state__text">Loading volunteers…</div>
      </div>

    <!-- ── Empty ────────────────────────────────────────────────────── -->
    } @else if (volunteers.length === 0) {
      @if (hasAnyFilter) {
        <app-empty-state icon="bi-people" title="No volunteers found"
          subtitle="No volunteers match your filters. Try adjusting your search." />
      } @else {
        <app-empty-state icon="bi-people" title="No volunteers yet"
          subtitle="Volunteers are placed candidates who have chosen to give back by supporting new job seekers." />
      }

    <!-- ── Grid View ────────────────────────────────────────────────── -->
    } @else if (viewMode === 'grid') {
      <div class="vol-grid">
        @for (v of volunteers; track v.id) {
          <div class="vol-card" [class.vol-card--inactive]="v.availability !== 'Active'">

            <div class="vol-card__header">
              <div class="vol-card__avatar-wrap">
                @if (v.photo_url) {
                  <img [src]="v.photo_url" [alt]="v.name" class="vol-card__avatar-img">
                } @else {
                  <div class="vol-card__avatar-initials">{{ initials(v.name) }}</div>
                }
              </div>
              @if (v.availability === 'Active') {
                <span class="vol-card__avail-badge vol-card__avail-badge--active">
                  <i class="bi bi-circle-fill"></i> Active
                </span>
              } @else {
                <span class="vol-card__avail-badge vol-card__avail-badge--inactive">
                  <i class="bi bi-circle"></i> Unavailable
                </span>
              }
            </div>

            <div class="vol-card__name">{{ v.name }}</div>

            <div class="vol-card__flags">
              @if (v.nationality) {
                <span class="vol-card__flag-chip" title="Nationality: {{ v.nationality }}">
                  {{ flagOf(v.nationality) }} {{ v.nationality }}
                </span>
              }
              @if (v.country_placed) {
                <span class="vol-card__flag-chip vol-card__flag-chip--placed">
                  <i class="bi bi-arrow-right-short"></i>
                  {{ flagOf(v.country_placed) }} {{ v.country_placed }}
                </span>
              }
            </div>

            <div class="vol-card__meta">
              @if (v.role) { <span class="vol-card__role-badge">{{ v.role }}</span> }
              @if (v.year_placed) {
                <span class="vol-card__year"><i class="bi bi-calendar3"></i> Placed in {{ v.year_placed }}</span>
              }
            </div>

            @if (v.languages?.length) {
              <div class="vol-card__languages">
                @for (lang of (v.languages ?? []).slice(0, 4); track lang) {
                  <span class="vol-card__lang-tag">{{ lang }}</span>
                }
                @if ((v.languages?.length ?? 0) > 4) {
                  <span class="vol-card__lang-tag vol-card__lang-tag--more">+{{ (v.languages?.length ?? 0) - 4 }}</span>
                }
              </div>
            }

            @if (v.success_story) {
              <div class="vol-card__story">
                <p class="vol-card__story-text" [class.vol-card__story-text--expanded]="isExpanded(v.id)">
                  {{ v.success_story }}
                </p>
                @if (v.success_story.length > 120) {
                  <button class="vol-card__read-more" (click)="toggleExpand(v.id)">
                    {{ isExpanded(v.id) ? 'Read Less' : 'Read More' }}
                    <i class="bi" [class.bi-chevron-down]="!isExpanded(v.id)" [class.bi-chevron-up]="isExpanded(v.id)"></i>
                  </button>
                }
              </div>
            }

            <div class="vol-card__helped">
              <i class="bi bi-people-fill"></i>
              Helped {{ v.candidates_helped ?? 0 }} candidate{{ (v.candidates_helped ?? 0) === 1 ? '' : 's' }}
            </div>

            <div class="vol-card__actions">
              <button class="vol-card__action-btn vol-card__action-btn--view" (click)="viewVolunteer(v)">
                <i class="bi bi-eye"></i> View
              </button>
              <button class="vol-card__action-btn vol-card__action-btn--edit" (click)="editVolunteer(v)">
                <i class="bi bi-pencil"></i> Edit
              </button>
              <button class="vol-card__action-btn"
                [class.vol-card__action-btn--deactivate]="v.availability === 'Active'"
                [class.vol-card__action-btn--activate]="v.availability !== 'Active'"
                (click)="toggleAvailability(v)" [disabled]="toggling === v.id">
                @if (toggling === v.id) {
                  <span class="spinner-border spinner-border-sm"></span>
                } @else if (v.availability === 'Active') {
                  <i class="bi bi-pause-circle"></i> Deactivate
                } @else {
                  <i class="bi bi-play-circle"></i> Activate
                }
              </button>
            </div>

          </div>
        }
      </div>

    <!-- ── List (Table) View ─────────────────────────────────────────── -->
    } @else {
      <div class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead class="table-light">
            <tr>
              <th style="width:40px">#</th>
              <th>Name</th>
              <th>Role / Sector</th>
              <th>Country Placed</th>
              <th>Languages</th>
              <th>Availability</th>
              <th class="text-center">Helped</th>
              <th class="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (v of volunteers; track v.id; let i = $index) {
              <tr [class.table-secondary]="v.availability !== 'Active'">
                <td class="text-muted small">{{ (pagination.page - 1) * pagination.limit + i + 1 }}</td>
                <td>
                  <div class="d-flex align-items-center gap-2">
                    @if (v.photo_url) {
                      <img [src]="v.photo_url" [alt]="v.name"
                        style="width:34px;height:34px;border-radius:50%;object-fit:cover;border:1px solid var(--th-border)">
                    } @else {
                      <div style="width:34px;height:34px;border-radius:50%;background:var(--th-gradient-success,linear-gradient(135deg,#22c55e,#16a34a));color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:.8rem;flex-shrink:0">
                        {{ initials(v.name) }}
                      </div>
                    }
                    <div>
                      <div class="fw-semibold small">{{ v.name }}</div>
                      @if (v.email) { <div class="text-muted" style="font-size:.7rem">{{ v.email }}</div> }
                    </div>
                  </div>
                </td>
                <td class="small">{{ v.role ?? '—' }}</td>
                <td class="small">
                  @if (v.country_placed) {
                    {{ flagOf(v.country_placed) }} {{ v.country_placed }}
                  } @else { — }
                </td>
                <td>
                  @if (v.languages?.length) {
                    <div class="d-flex flex-wrap gap-1">
                      @for (lang of (v.languages ?? []).slice(0, 3); track lang) {
                        <span style="font-size:.65rem;background:#f5f3ff;color:#6d28d9;border:1px solid #ddd6fe;padding:.1rem .4rem;border-radius:999px">{{ lang }}</span>
                      }
                      @if ((v.languages?.length ?? 0) > 3) {
                        <span style="font-size:.65rem;background:#f3f4f6;color:#6b7280;border:1px solid var(--th-border);padding:.1rem .4rem;border-radius:999px">+{{ (v.languages?.length ?? 0) - 3 }}</span>
                      }
                    </div>
                  } @else { <span class="text-muted small">—</span> }
                </td>
                <td>
                  @if (v.availability === 'Active') {
                    <span class="badge bg-success-subtle text-success border border-success-subtle" style="font-size:.7rem">Active</span>
                  } @else {
                    <span class="badge bg-secondary-subtle text-secondary border border-secondary-subtle" style="font-size:.7rem">Unavailable</span>
                  }
                </td>
                <td class="text-center small">{{ v.candidates_helped ?? 0 }}</td>
                <td class="text-end">
                  <div class="d-flex justify-content-end gap-1">
                    <button class="btn btn-xs btn-outline-primary" (click)="viewVolunteer(v)" title="View">
                      <i class="bi bi-eye"></i>
                    </button>
                    <button class="btn btn-xs btn-outline-warning" (click)="editVolunteer(v)" title="Edit">
                      <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-xs"
                      [class.btn-outline-danger]="v.availability === 'Active'"
                      [class.btn-outline-success]="v.availability !== 'Active'"
                      (click)="toggleAvailability(v)" [disabled]="toggling === v.id"
                      [title]="v.availability === 'Active' ? 'Deactivate' : 'Activate'">
                      @if (toggling === v.id) {
                        <span class="spinner-border spinner-border-sm"></span>
                      } @else {
                        <i class="bi" [class.bi-pause-circle]="v.availability === 'Active'" [class.bi-play-circle]="v.availability !== 'Active'"></i>
                      }
                    </button>
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }

    <!-- ── Pagination ───────────────────────────────────────────────── -->
    @if (!loading && volunteers.length > 0 && pagination.pages > 1) {
      <nav class="mt-4 d-flex justify-content-center">
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

    <!-- ── Edit Panel ───────────────────────────────────────────────── -->
    @if (panelOpen) {
      <div class="file-preview-overlay" (click)="closePanel()">
        <div class="rec-edit-panel" (click)="$event.stopPropagation()">
          <div class="rec-edit-panel__header">
            <div class="rec-edit-panel__avatar" style="background:var(--th-gradient-success)">
              <i class="bi bi-person-fill" style="font-size:.9rem"></i>
            </div>
            <div class="rec-edit-panel__title-group">
              <div class="rec-edit-panel__title">Edit Volunteer</div>
              <div class="rec-edit-panel__subtitle">{{ editingVolunteer?.name }}</div>
            </div>
            <button type="button" class="file-preview-dialog__close" (click)="closePanel()">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
          <div class="rec-edit-panel__body">
            <form [formGroup]="form" (ngSubmit)="save()">
              <div class="rep-section">
                <div class="rep-section__label"><i class="bi bi-person"></i> Details</div>
                <div class="mb-3">
                  <label class="form-label">Name <span class="text-danger">*</span></label>
                  <input formControlName="name" class="form-control" placeholder="Full name" [class.is-invalid]="invalid('name')">
                  @if (invalid('name')) { <div class="invalid-feedback">Name is required.</div> }
                </div>
                <div class="mb-3">
                  <label class="form-label">Role / Sector <span class="rep-optional">optional</span></label>
                  <input formControlName="role" class="form-control" placeholder="e.g. Registered Nurse">
                </div>
                <div class="mb-3">
                  <label class="form-label">Email <span class="rep-optional">optional</span></label>
                  <input formControlName="email" class="form-control" type="email" placeholder="volunteer@example.com" [class.is-invalid]="invalid('email')">
                  @if (invalid('email')) { <div class="invalid-feedback">Enter a valid email address.</div> }
                </div>
                <div class="mb-0">
                  <label class="form-label">Phone <span class="rep-optional">optional</span></label>
                  <input formControlName="phone" class="form-control" placeholder="+1 555 000 0000">
                </div>
              </div>
              <div class="rep-section">
                <div class="rep-section__label"><i class="bi bi-chat-left-text"></i> Notes</div>
                <textarea formControlName="notes" class="form-control" rows="3" placeholder="Any relevant notes…"></textarea>
              </div>
              @if (saveError) {
                <div class="alert alert-danger small py-2 mb-3">
                  <i class="bi bi-exclamation-triangle me-1"></i>{{ saveError }}
                </div>
              }
              <div class="rec-edit-panel__footer">
                <button type="button" class="btn btn-outline-secondary" (click)="closePanel()">Cancel</button>
                <button type="submit" class="btn btn-primary" [disabled]="saving">
                  @if (saving) { <span class="spinner-border spinner-border-sm me-1"></span>Saving… }
                  @else { <i class="bi bi-check-lg me-1"></i>Save Changes }
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    }

    <style>
      /* ── Top bar ───────────────────────────────────────────────── */
      .cfs-topbar {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: .5rem;
      }
      .cfs-search-wrap {
        display: flex;
        align-items: center;
        position: relative;
        flex: 1 1 220px;
        min-width: 180px;
      }
      .cfs-search-icon {
        position: absolute;
        left: 10px;
        color: var(--th-text-muted, #9ca3af);
        font-size: .85rem;
        pointer-events: none;
      }
      .cfs-search-input {
        flex: 1;
        height: 34px;
        padding-left: 30px;
        padding-right: 70px;
        border: 1px solid var(--th-border-strong, #d1d5db);
        border-radius: 8px;
        font-size: .85rem;
        background: var(--th-surface-2, #f9fafb);
        color: var(--th-text, #111827);
        width: 100%;
      }
      .cfs-search-input:focus { outline: none; border-color: var(--th-primary, #6366f1); background: var(--th-surface, #fff); }
      .cfs-search-btn {
        position: absolute;
        right: 4px;
        height: 26px;
        padding: 0 10px;
        border-radius: 6px;
        border: none;
        background: var(--th-primary, #6366f1);
        color: #fff;
        font-size: .75rem;
        font-weight: 600;
        cursor: pointer;
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

      /* ── Grid layout ─────────────────────────────────────────────── */
      .vol-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.25rem; }

      /* ── Card ───────────────────────────────────────────────────── */
      .vol-card {
        background: var(--th-surface, #fff);
        border: 1px solid var(--th-border, #e5e7eb);
        border-radius: 14px;
        padding: 1.25rem;
        display: flex;
        flex-direction: column;
        gap: .75rem;
        transition: box-shadow .18s, transform .18s;
        position: relative;
      }
      .vol-card:hover { box-shadow: 0 6px 24px rgba(0,0,0,.09); transform: translateY(-2px); }
      .vol-card--inactive { opacity: .75; background: var(--th-surface-2, #f8f9fa); }
      .vol-card__header { display: flex; align-items: flex-start; justify-content: space-between; }
      .vol-card__avatar-wrap { width: 60px; height: 60px; border-radius: 50%; overflow: hidden; flex-shrink: 0; border: 2px solid var(--th-border, #e5e7eb); }
      .vol-card__avatar-img { width: 100%; height: 100%; object-fit: cover; }
      .vol-card__avatar-initials { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: var(--th-gradient-success, linear-gradient(135deg,#22c55e,#16a34a)); color: #fff; font-weight: 700; font-size: 1.1rem; }
      .vol-card__avail-badge { display: inline-flex; align-items: center; gap: .3rem; font-size: .7rem; font-weight: 600; padding: .25rem .6rem; border-radius: 999px; letter-spacing: .03em; }
      .vol-card__avail-badge--active { background: #dcfce7; color: #15803d; }
      .vol-card__avail-badge--active i { font-size: .45rem; }
      .vol-card__avail-badge--inactive { background: #f3f4f6; color: #6b7280; }
      .vol-card__avail-badge--inactive i { font-size: .45rem; }
      .vol-card__name { font-weight: 700; font-size: 1rem; color: var(--th-text, #111827); line-height: 1.3; }
      .vol-card__flags { display: flex; flex-wrap: wrap; gap: .35rem; }
      .vol-card__flag-chip { display: inline-flex; align-items: center; gap: .25rem; font-size: .72rem; background: var(--th-surface-2, #f3f4f6); color: var(--th-text-secondary, #374151); padding: .2rem .55rem; border-radius: 999px; border: 1px solid var(--th-border, #e5e7eb); white-space: nowrap; max-width: 160px; overflow: hidden; text-overflow: ellipsis; }
      .vol-card__flag-chip--placed { background: #eff6ff; border-color: #bfdbfe; color: #1d4ed8; }
      .vol-card__meta { display: flex; flex-wrap: wrap; align-items: center; gap: .4rem; }
      .vol-card__role-badge { display: inline-block; background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; font-size: .72rem; font-weight: 600; padding: .2rem .6rem; border-radius: 6px; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .vol-card__year { font-size: .72rem; color: var(--th-text-muted, #6b7280); display: inline-flex; align-items: center; gap: .25rem; }
      .vol-card__languages { display: flex; flex-wrap: wrap; gap: .3rem; }
      .vol-card__lang-tag { font-size: .68rem; background: #f5f3ff; color: #6d28d9; border: 1px solid #ddd6fe; padding: .15rem .5rem; border-radius: 999px; font-weight: 500; }
      .vol-card__lang-tag--more { background: var(--th-surface-2, #f3f4f6); color: var(--th-text-muted, #6b7280); border-color: var(--th-border, #e5e7eb); }
      .vol-card__story { border-top: 1px solid var(--th-border, #e5e7eb); padding-top: .6rem; }
      .vol-card__story-text { font-size: .8rem; color: var(--th-text-secondary, #374151); line-height: 1.5; margin: 0 0 .25rem; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; }
      .vol-card__story-text--expanded { display: block; -webkit-line-clamp: unset; overflow: visible; }
      .vol-card__read-more { background: none; border: none; padding: 0; font-size: .75rem; font-weight: 600; color: var(--th-primary, #6366f1); cursor: pointer; display: inline-flex; align-items: center; gap: .25rem; }
      .vol-card__read-more:hover { text-decoration: underline; }
      .vol-card__helped { font-size: .75rem; color: var(--th-text-muted, #6b7280); display: inline-flex; align-items: center; gap: .35rem; font-weight: 500; }
      .vol-card__helped i { color: var(--th-primary, #6366f1); }
      .vol-card__actions { display: flex; gap: .4rem; margin-top: auto; padding-top: .5rem; border-top: 1px solid var(--th-border, #e5e7eb); flex-wrap: wrap; }
      .vol-card__action-btn { flex: 1; min-width: 0; display: inline-flex; align-items: center; justify-content: center; gap: .3rem; font-size: .75rem; font-weight: 600; padding: .35rem .5rem; border-radius: 8px; border: 1px solid transparent; cursor: pointer; white-space: nowrap; transition: background .15s; }
      .vol-card__action-btn--view { background: #eff6ff; color: #1d4ed8; border-color: #bfdbfe; }
      .vol-card__action-btn--view:hover { background: #dbeafe; }
      .vol-card__action-btn--edit { background: #fefce8; color: #a16207; border-color: #fde68a; }
      .vol-card__action-btn--edit:hover { background: #fef9c3; }
      .vol-card__action-btn--deactivate { background: #fef2f2; color: #b91c1c; border-color: #fecaca; }
      .vol-card__action-btn--deactivate:hover { background: #fee2e2; }
      .vol-card__action-btn--activate { background: #f0fdf4; color: #15803d; border-color: #bbf7d0; }
      .vol-card__action-btn--activate:hover { background: #dcfce7; }
      .vol-card__action-btn:disabled { opacity: .6; cursor: not-allowed; }

      /* ── Table extras ────────────────────────────────────────────── */
      .btn-xs { padding: .2rem .45rem; font-size: .75rem; }
    </style>
  `,
})
export class VolunteerListComponent implements OnInit {
  volunteers: Volunteer[] = [];
  pagination = { page: 1, limit: 20, total: 0, pages: 0 };
  loading    = false;
  exporting  = false;
  viewMode: 'grid' | 'list' = 'grid';
  advOpen = false;

  searchCtrl = new FormControl('');
  sortCtrl   = new FormControl('newest');

  filterForm!: FormGroup;

  panelOpen        = false;
  editingVolunteer: Volunteer | null = null;
  form!: FormGroup;
  saving    = false;
  saveError = '';
  toggling: string | null = null;

  private expandedCards = new Set<string>();

  private readonly flagMap = computed<Map<string, string>>(() => {
    const map = new Map<string, string>();
    this.master.countries().forEach(c => map.set(c.name.toLowerCase(), c.flag_emoji));
    return map;
  });

  readonly countryNames = computed<string[]>(() =>
    this.master.countries().map(c => c.name).sort()
  );

  readonly languageNames = computed<string[]>(() =>
    this.master.languages().map(l => l.name).sort()
  );

  get hasAnyFilter(): boolean {
    const s = this.searchCtrl.value ?? '';
    const f = this.filterForm?.value ?? {};
    return !!s || !!f['country_placed'] || !!f['language'] || !!f['availability'];
  }

  get activeAdvCount(): number {
    const f = this.filterForm?.value ?? {};
    return [f['country_placed'], f['language'], f['availability']].filter(Boolean).length;
  }

  constructor(
    private fb: FormBuilder,
    private volunteerSvc: VolunteerService,
    private master: MasterDataService,
    private router: Router,
    private toast: ToastService,
    private confirm: ConfirmDialogService,
  ) {}

  ngOnInit(): void {
    this.master.loadAll();
    this.filterForm = this.fb.group({
      country_placed: [''],
      language:       [''],
      availability:   [''],
    });
    this.load();
  }

  private buildFilters(): VolunteerFilters {
    const f = this.filterForm?.value ?? {};
    return {
      search:        this.searchCtrl.value || undefined,
      country_placed: f['country_placed'] || undefined,
      language:      f['language']       || undefined,
      availability:  f['availability']   || undefined,
      sort:          this.sortCtrl.value  || undefined,
      page:          this.pagination.page,
      limit:         this.pagination.limit,
    };
  }

  load(): void {
    this.loading = true;
    this.volunteerSvc.list(this.buildFilters())
      .pipe(catchError(() => of(null)))
      .subscribe(res => {
        this.loading = false;
        if (res) { this.volunteers = res.data; this.pagination = res.pagination; }
      });
  }

  applySearch(): void { this.pagination.page = 1; this.load(); }
  onSortChange(): void { this.pagination.page = 1; this.load(); }
  applyFilters(): void { this.pagination.page = 1; this.load(); }

  clearFilters(): void {
    this.searchCtrl.setValue('');
    this.sortCtrl.setValue('newest');
    this.filterForm.reset({ country_placed: '', language: '', availability: '' });
    this.advOpen = false;
    this.pagination.page = 1;
    this.load();
  }

  exportCsv(): void {
    this.exporting = true;
    const { page: _p, limit: _l, ...filters } = this.buildFilters();
    this.volunteerSvc.exportCsv(filters).subscribe({
      next: (blob) => {
        this.exporting = false;
        const url = URL.createObjectURL(blob);
        const a   = document.createElement('a');
        a.href    = url;
        a.download = `volunteers-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => { this.exporting = false; this.toast.error('Export failed'); },
    });
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.pagination.pages) return;
    this.pagination.page = page; this.load();
  }

  pageNumbers(): number[] {
    const { page, pages } = this.pagination;
    const start = Math.max(1, page - 2);
    const end   = Math.min(pages, page + 2);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  initials(name: string): string {
    return name.trim().split(/\s+/).slice(0, 2).map(p => p[0].toUpperCase()).join('');
  }

  flagOf(name?: string | null): string {
    if (!name) return '';
    return this.flagMap().get(name.toLowerCase()) ?? '';
  }

  isExpanded(id: string): boolean { return this.expandedCards.has(id); }

  toggleExpand(id: string): void {
    this.expandedCards.has(id) ? this.expandedCards.delete(id) : this.expandedCards.add(id);
  }

  viewVolunteer(v: Volunteer): void {
    this.router.navigate(['/admin/volunteers', v.id]);
  }

  editVolunteer(v: Volunteer): void {
    this.router.navigate(['/admin/volunteers/create'], { queryParams: { edit: v.id } });
  }

  toggleAvailability(v: Volunteer): void {
    const next = v.availability === 'Active' ? 'Temporarily Unavailable' : 'Active';
    this.toggling = v.id;
    this.volunteerSvc.update(v.id, { availability: next as any }).subscribe({
      next: (res) => {
        this.toggling = null;
        const idx = this.volunteers.findIndex(x => x.id === v.id);
        if (idx !== -1) this.volunteers[idx] = res.volunteer;
        this.toast.success(next === 'Active' ? 'Volunteer activated' : 'Volunteer deactivated');
      },
      error: (err) => {
        this.toggling = null;
        this.toast.error(err?.error?.message ?? 'Failed to update availability');
      },
    });
  }

  invalid(field: string): boolean {
    const c = this.form?.get(field);
    return !!(c && c.invalid && c.touched);
  }

  closePanel(): void { this.panelOpen = false; this.editingVolunteer = null; this.saving = false; }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    this.saveError = '';

    const raw = this.form.value;
    const payload = {
      name:  raw.name.trim(),
      role:  raw.role?.trim()  || undefined,
      email: raw.email?.trim() || undefined,
      phone: raw.phone?.trim() || undefined,
      notes: raw.notes?.trim() || undefined,
    };

    this.volunteerSvc.update(this.editingVolunteer!.id, payload).subscribe({
      next: () => { this.saving = false; this.toast.success('Volunteer updated'); this.closePanel(); this.load(); },
      error: (err) => { this.saving = false; this.saveError = err?.error?.message ?? 'Failed to save volunteer.'; },
    });
  }
}
