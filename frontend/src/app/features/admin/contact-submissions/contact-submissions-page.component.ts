// src/app/features/admin/contact-submissions/contact-submissions-page.component.ts
import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ContactSubmissionService } from '../../../core/services/contact-submission.service';
import { ContactSubmission } from '../../../core/models/contact-submission.model';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-contact-submissions-page',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent],
  template: `
    <app-page-header
      title="Contact Requests"
      [subtitle]="'Total: ' + pagination().total"
      icon="bi-envelope-fill"
    ></app-page-header>

    <!-- Loading -->
    @if (loading()) {
      <div class="loading-state">
        <div class="spinner-border"></div>
        <div class="loading-state__text">Loading requests…</div>
      </div>
    }

    <!-- Empty -->
    @if (!loading() && rows().length === 0) {
      <div class="empty-state">
        <div class="empty-state__icon"><i class="bi bi-inbox"></i></div>
        <h5 class="empty-state-title">No contact requests found</h5>
        <p class="empty-state-message">Submissions from the contact form will appear here.</p>
      </div>
    }

    <!-- Table -->
    @if (!loading() && rows().length > 0) {
      <div class="section-card">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0 small">
            <thead class="table-light">
              <tr>
                <th>Status</th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Subject</th>
                <th>Message</th>
                <th>Received</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (s of rows(); track s.id) {
                <tr [class.fw-semibold]="!s.is_read">
                  <td>
                    @if (s.is_read) {
                      <span class="badge rounded-pill"
                        style="background:var(--th-surface-2);color:var(--th-text-secondary);font-size:.65rem">
                        Read
                      </span>
                    } @else {
                      <span class="badge rounded-pill"
                        style="background:var(--th-primary-soft);color:var(--th-primary);font-size:.65rem">
                        New
                      </span>
                    }
                  </td>
                  <td class="text-nowrap">{{ s.name }}</td>
                  <td class="text-muted">{{ s.email }}</td>
                  <td class="text-muted">{{ s.phone || '—' }}</td>
                  <td class="text-muted">{{ s.subject || '—' }}</td>
                  <td style="max-width:240px">
                    @if (expandedId() === s.id) {
                      <div style="white-space:pre-wrap;word-break:break-word">{{ s.message }}</div>
                      <button class="btn btn-link btn-sm p-0 text-decoration-none"
                        style="font-size:.72rem" (click)="expandedId.set(null)">
                        Collapse
                      </button>
                    } @else {
                      <span class="text-muted"
                        style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:block;max-width:240px"
                        [title]="s.message">
                        {{ s.message }}
                      </span>
                      <button class="btn btn-link btn-sm p-0 text-decoration-none"
                        style="font-size:.72rem" (click)="expand(s)">
                        View
                      </button>
                    }
                  </td>
                  <td class="text-muted text-nowrap" style="font-size:.72rem">
                    {{ s.submitted_at | date:'dd MMM yyyy, HH:mm' }}
                  </td>
                  <td>
                    @if (!s.is_read) {
                      <button class="btn btn-link btn-sm p-0 text-decoration-none text-nowrap"
                        style="font-size:.75rem" (click)="markRead(s)">
                        Mark read
                      </button>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        @if (pagination().pages > 1) {
          <div class="d-flex justify-content-between align-items-center px-3 py-2 border-top">
            <small class="text-muted">
              Page {{ pagination().page }} of {{ pagination().pages }}
              ({{ pagination().total }} entries)
            </small>
            <div class="d-flex gap-1">
              <button class="btn btn-sm btn-outline-secondary"
                [disabled]="pagination().page === 1"
                (click)="goToPage(pagination().page - 1)">&laquo;</button>
              @for (pg of pageRange(); track pg) {
                <button class="btn btn-sm"
                  [class.btn-primary]="pg === pagination().page"
                  [class.btn-outline-secondary]="pg !== pagination().page"
                  (click)="goToPage(pg)">{{ pg }}</button>
              }
              <button class="btn btn-sm btn-outline-secondary"
                [disabled]="pagination().page === pagination().pages"
                (click)="goToPage(pagination().page + 1)">&raquo;</button>
            </div>
          </div>
        }
      </div>
    }
  `,
})
export class ContactSubmissionsPageComponent implements OnInit {
  rows       = signal<ContactSubmission[]>([]);
  loading    = signal(true);
  expandedId = signal<string | null>(null);
  pagination = signal({ page: 1, limit: 20, total: 0, pages: 1 });

  constructor(private svc: ContactSubmissionService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.svc.list(this.pagination().page, this.pagination().limit).subscribe({
      next: (r) => {
        this.rows.set(r.data);
        this.pagination.set(r.pagination);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  expand(s: ContactSubmission): void {
    this.expandedId.set(s.id);
    if (!s.is_read) this.markRead(s);
  }

  markRead(s: ContactSubmission): void {
    this.svc.markRead(s.id).subscribe({
      next: () => this.rows.update(list =>
        list.map(r => r.id === s.id ? { ...r, is_read: true } : r)
      ),
    });
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.pagination().pages) return;
    this.pagination.update(p => ({ ...p, page }));
    this.load();
  }

  pageRange(): number[] {
    const { page, pages } = this.pagination();
    const start = Math.max(1, page - 2);
    const end   = Math.min(pages, page + 2);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }
}
