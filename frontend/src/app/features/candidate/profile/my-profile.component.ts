// src/app/features/candidate/profile/my-profile.component.ts
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CandidateService } from '../../../core/services/candidate.service';
import { Candidate } from '../../../core/models/candidate.model';
import { CandidateProfileComponent } from '../../../shared/components/candidate-profile/candidate-profile.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-my-profile',
  standalone: true,
  imports: [CommonModule, RouterLink, CandidateProfileComponent, PageHeaderComponent],
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

      <!-- Quick-action bar -->
      <div class="d-flex gap-2 mb-4">
        <a routerLink="/candidate/edit-request"
          class="btn btn-primary btn-sm">
          <i class="bi bi-pencil-square me-1"></i> Request Edit
        </a>
      </div>

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
  error = '';

  previewOpen = signal(false);
  previewType = signal<'image' | 'video' | 'pdf'>('image');
  previewUrl  = signal('');
  previewName = signal('');

  constructor(private candidateService: CandidateService) {}

  ngOnInit(): void {
    this.candidateService.getMyProfile().subscribe({
      next:  (res) => (this.candidate = res.candidate),
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
