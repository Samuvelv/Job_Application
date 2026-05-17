// src/app/features/candidate/profile/my-profile.component.ts
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CandidateService } from '../../../core/services/candidate.service';
import { AuthService } from '../../../core/services/auth.service';
import { Candidate } from '../../../core/models/candidate.model';
import { CandidateProfileComponent } from '../../../shared/components/candidate-profile/candidate-profile.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-my-profile',
  standalone: true,
  imports: [CommonModule, RouterLink, CandidateProfileComponent, PageHeaderComponent],
  styles: [`
    .placed-banner {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
      padding: 1.1rem 1.25rem;
      border-radius: 14px;
      background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
      border: 1.5px solid #6ee7b7;
      margin-bottom: 1.5rem;
    }
    .placed-banner__icon { font-size: 2rem; color: #059669; flex-shrink: 0; line-height: 1; }
    .placed-banner__title { font-size: .95rem; font-weight: 700; color: #065f46; margin-bottom: .3rem; }
    .placed-banner__sub { font-size: .82rem; color: #047857; line-height: 1.5; }
  `],
  template: `
    <app-page-header
      title="My Profile"
      subtitle="View your current profile information"
      icon="bi-person-badge"
    />

    @if (error) {
      <div class="alert alert-danger">{{ error }}</div>
    } @else if (!candidate) {
      <div class="loading-state">
        <div class="spinner-border"></div>
        <div class="loading-state__text">Loading your profile…</div>
      </div>
    } @else {

      <!-- Placed banner -->
      @if (isPlaced) {
        <div class="placed-banner">
          <div class="placed-banner__icon"><i class="bi bi-patch-check-fill"></i></div>
          <div>
            <div class="placed-banner__title">Congratulations! You have been successfully placed.</div>
            <div class="placed-banner__sub">
              Your profile is now in placed status. Profile editing and request changes are disabled.
              You can continue to view your dashboard and profile information.
            </div>
          </div>
        </div>
      }

      <!-- Quick-action bar — hidden for placed candidates -->
      @if (!isPlaced) {
        <div class="d-flex gap-2 mb-4">
          <a routerLink="/candidate/edit-request"
            class="btn btn-primary btn-sm">
            <i class="bi bi-pencil-square me-1"></i> Request Edit
          </a>
        </div>
      }

      <!-- Profile (read-only) -->
      <app-candidate-profile [candidate]="candidate" />

    }

    <!-- Preview Overlay -->
    @if (previewOpen()) {
      <div class="file-preview-overlay" (click)="closePreview()">
        <div class="file-preview-dialog" (click)="$event.stopPropagation()">
          <div class="file-preview-dialog__header">
            <span class="file-preview-dialog__title">{{ previewName() }}</span>
            <button type="button" class="file-preview-dialog__close"
              (click)="closePreview()">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
          <div class="file-preview-dialog__body">
            @if (previewType() === 'image') {
              <img [src]="previewUrl()" alt="Preview"
                style="max-width:100%;max-height:70vh;border-radius:var(--th-radius);display:block;margin:0 auto">
            } @else if (previewType() === 'video') {
              <video [src]="previewUrl()" controls autoplay
                style="max-width:100%;max-height:70vh;border-radius:var(--th-radius);display:block;margin:0 auto">
              </video>
            } @else {
              <div style="text-align:center;padding:3rem 1rem">
                <i class="bi bi-file-earmark-pdf-fill"
                  style="font-size:4rem;color:var(--th-rose);display:block;margin-bottom:1rem"></i>
                <p class="text-muted mb-3">PDF preview is not available inline.</p>
                <a [href]="previewUrl()" target="_blank" class="btn btn-primary">
                  <i class="bi bi-box-arrow-up-right me-1"></i> Open in new tab
                </a>
              </div>
            }
          </div>
        </div>
      </div>
    }
  `,
})
export class MyProfileComponent implements OnInit {
  candidate: Candidate | null = null;
  isPlaced = false;
  error = '';

  previewOpen = signal(false);
  previewType = signal<'image' | 'video' | 'pdf'>('image');
  previewUrl  = signal('');
  previewName = signal('');

  constructor(
    private candidateService: CandidateService,
    private auth: AuthService,
  ) {}

  ngOnInit(): void {
    this.candidateService.getMyProfile().subscribe({
      next: (res) => {
        this.candidate = res.candidate;
        this.isPlaced  = res.candidate.profile_status === 'placed';
        this.auth.setCandidateStatus(res.candidate.profile_status ?? 'active');
      },
      error: (err) => (this.error = err?.error?.message ?? 'Failed to load profile.'),
    });
  }

  openPreview(type: 'image' | 'video' | 'pdf', url: string, name: string): void {
    this.previewType.set(type);
    this.previewUrl.set(url);
    this.previewName.set(name);
    this.previewOpen.set(true);
  }

  closePreview(): void {
    this.previewOpen.set(false);
    this.previewUrl.set('');
  }
}
