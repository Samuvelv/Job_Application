// src/app/features/recruiter/candidates/candidate-profile.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { CandidateService } from '../../../core/services/candidate.service';
import { RecruiterService } from '../../../core/services/recruiter.service';
import { Candidate } from '../../../core/models/candidate.model';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { CandidateProfileComponent } from '../../../shared/components/candidate-profile/candidate-profile.component';

@Component({
  selector: 'app-candidate-profile',
  standalone: true,
  imports: [CommonModule, RouterLink, PageHeaderComponent, CandidateProfileComponent],
  template: `
    <!-- Back button + action bar -->
    <div class="d-flex align-items-center gap-3 mb-3 flex-wrap">
      <a routerLink="/recruiter/candidates" class="btn btn-sm btn-outline-secondary">
        <i class="bi bi-arrow-left me-1"></i>Back to Candidates
      </a>

      @if (candidate) {
        <div class="ms-auto d-flex align-items-center gap-2">
          @if (shortlisted) {
            <span class="badge rounded-pill px-3 py-2"
              style="background:var(--th-emerald-soft);color:var(--th-emerald);font-size:.8rem;">
              <i class="bi bi-bookmark-star-fill me-1"></i>Shortlisted
            </span>
          } @else {
            <button class="btn btn-primary btn-sm" (click)="addToShortlist()"
              [disabled]="shortlisting">
              @if (shortlisting) {
                <span class="spinner-border spinner-border-sm me-1"></span>Adding…
              } @else {
                <i class="bi bi-bookmark-plus me-1"></i>Add to Shortlist
              }
            </button>
          }
        </div>
      }
    </div>

    <!-- Loading -->
    @if (loading) {
      <div class="loading-state">
        <div class="spinner-border"></div>
        <div class="loading-state__text">Loading profile…</div>
      </div>

    <!-- Error -->
    } @else if (error) {
      <div class="alert alert-danger">{{ error }}</div>

    <!-- Profile -->
    } @else if (candidate) {
      <app-candidate-profile [candidate]="candidate" />
    }
  `,
})
export class RecruiterCandidateProfileComponent implements OnInit {
  candidate: Candidate | null = null;
  loading = true;
  error = '';
  shortlisted = false;
  shortlisting = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private candidateService: CandidateService,
    private recruiterService: RecruiterService,
    private toast: ToastService,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;

    // Load candidate profile
    this.candidateService.getById(id).pipe(
      catchError((err) => {
        this.error = err?.error?.message ?? 'Failed to load candidate profile.';
        this.loading = false;
        return of(null);
      }),
    ).subscribe((res) => {
      if (res) {
        this.candidate = res.candidate;
        this.loading = false;
      }
    });

    // Check if already shortlisted
    this.recruiterService.getShortlist().subscribe({
      next: (res) => {
        this.shortlisted = res.shortlist.some((e) => e.candidate_id === id);
      },
    });
  }

  addToShortlist(): void {
    if (!this.candidate) return;
    this.shortlisting = true;
    this.recruiterService.addToShortlist(this.candidate.id).subscribe({
      next: () => {
        this.shortlisting = false;
        this.shortlisted = true;
        this.toast.success(`${this.candidate!.first_name} ${this.candidate!.last_name} added to shortlist`);
      },
      error: (err) => {
        this.shortlisting = false;
        this.toast.error(err?.error?.message ?? 'Failed to shortlist');
      },
    });
  }
}
