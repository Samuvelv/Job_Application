// src/app/features/admin/candidate-profile/candidate-profile-page.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CandidateService } from '../../../core/services/candidate.service';
import { Candidate } from '../../../core/models/candidate.model';
import { CandidateProfileComponent } from '../../../shared/components/candidate-profile/candidate-profile.component';

@Component({
  selector: 'app-candidate-profile-page',
  standalone: true,
  imports: [CommonModule, RouterLink, CandidateProfileComponent],
  template: `
    <!-- Header row: back + edit -->
    <div class="d-flex align-items-center justify-content-between mb-3 gap-2">
      <a routerLink="/admin/candidates" class="back-btn">
        <i class="bi bi-arrow-left"></i>Back to Candidates
      </a>
      @if (candidate) {
        <a [routerLink]="['/admin/candidates', candidate.id, 'edit']"
          class="btn btn-primary btn-sm">
          <i class="bi bi-pencil me-1"></i>Edit Candidate
        </a>
      }
    </div>

    @if (error) {
      <div class="alert alert-danger">{{ error }}</div>
    } @else if (!candidate) {
      <div class="loading-state">
        <div class="spinner-border"></div>
        <div class="loading-state__text">Loading profile…</div>
      </div>
    } @else {
      <app-candidate-profile [candidate]="candidate" />
    }
  `,
})
export class CandidateProfilePageComponent implements OnInit {
  candidate: Candidate | null = null;
  error = '';

  constructor(
    private route: ActivatedRoute,
    private candidateService: CandidateService,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error = 'Invalid candidate ID.';
      return;
    }
    this.candidateService.getById(id).subscribe({
      next: (res) => (this.candidate = res.candidate),
      error: (err) => (this.error = err?.error?.message ?? 'Failed to load candidate.'),
    });
  }
}
