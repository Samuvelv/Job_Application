// frontend/src/app/shared/components/translation-modal/translation-modal.component.ts
import { Component, Input, Output, EventEmitter, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

interface TranslatedCandidate {
  firstName: string;
  lastName: string;
  bio?: string;
  experiences?: Array<{
    jobTitle: string;
    companyName: string;
    startDate: string;
    endDate?: string;
    description?: string;
  }>;
  educations?: Array<{
    degree: string;
    institution: string;
    description?: string;
  }>;
  hobbies?: string[];
  certifications?: Array<{
    name: string;
    issuingOrganization: string;
    description?: string;
  }>;
  volunteerExperiences?: Array<{
    organizationName: string;
    description?: string;
  }>;
}

@Component({
  selector: 'app-translation-modal',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './translation-modal.component.html',
  styleUrls: ['./translation-modal.component.scss'],
})
export class TranslationModalComponent implements OnInit {
  @Input() candidate!: TranslatedCandidate;
  @Input() language!: string;
  @Input() languageName!: string;
  @Output() close = new EventEmitter<void>();
  @ViewChild('modalContent', { static: false }) modalContent!: ElementRef;

  copySuccess = false;
  copyErrorMsg: string | null = null;

  ngOnInit(): void {
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
  }

  ngOnDestroy(): void {
    // Restore body scroll when modal closes
    document.body.style.overflow = 'auto';
  }

  closeModal(): void {
    this.close.emit();
  }

  copyToClipboard(): void {
    this.copySuccess = false;
    this.copyErrorMsg = null;

    const textToCopy = this.getPlainText();

    navigator.clipboard
      .writeText(textToCopy)
      .then(() => {
        this.copySuccess = true;
        setTimeout(() => {
          this.copySuccess = false;
        }, 3000);
      })
      .catch((err) => {
        console.error('Failed to copy to clipboard:', err);
        this.copyErrorMsg = 'Failed to copy to clipboard';
        setTimeout(() => {
          this.copyErrorMsg = null;
        }, 3000);
      });
  }

  downloadAsText(): void {
    const textContent = this.getPlainText();
    const fileName = `${this.candidate.firstName}_${this.candidate.lastName}_${this.language}.txt`;

    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  private getPlainText(): string {
    const lines: string[] = [];

    // Header
    lines.push(`${this.candidate.firstName} ${this.candidate.lastName}`);
    lines.push(`Language: ${this.languageName}`);
    lines.push('='.repeat(60));
    lines.push('');

    // Bio
    if (this.candidate.bio) {
      lines.push('BIOGRAPHY');
      lines.push('-'.repeat(60));
      lines.push(this.candidate.bio);
      lines.push('');
    }

    // Work Experience
    if (this.candidate.experiences && this.candidate.experiences.length > 0) {
      lines.push('WORK EXPERIENCE');
      lines.push('-'.repeat(60));
      this.candidate.experiences.forEach((exp, idx) => {
        lines.push(`${idx + 1}. ${exp.jobTitle} at ${exp.companyName}`);
        lines.push(`   ${exp.startDate} - ${exp.endDate || 'Present'}`);
        if (exp.description) {
          lines.push(`   ${exp.description}`);
        }
        lines.push('');
      });
    }

    // Education
    if (this.candidate.educations && this.candidate.educations.length > 0) {
      lines.push('EDUCATION');
      lines.push('-'.repeat(60));
      this.candidate.educations.forEach((edu, idx) => {
        lines.push(`${idx + 1}. ${edu.degree} from ${edu.institution}`);
        if (edu.description) {
          lines.push(`   ${edu.description}`);
        }
        lines.push('');
      });
    }

    // Certifications
    if (this.candidate.certifications && this.candidate.certifications.length > 0) {
      lines.push('CERTIFICATIONS');
      lines.push('-'.repeat(60));
      this.candidate.certifications.forEach((cert, idx) => {
        lines.push(`${idx + 1}. ${cert.name} - ${cert.issuingOrganization}`);
        if (cert.description) {
          lines.push(`   ${cert.description}`);
        }
        lines.push('');
      });
    }

    // Volunteer Experience
    if (
      this.candidate.volunteerExperiences &&
      this.candidate.volunteerExperiences.length > 0
    ) {
      lines.push('VOLUNTEER EXPERIENCE');
      lines.push('-'.repeat(60));
      this.candidate.volunteerExperiences.forEach((vol, idx) => {
        lines.push(`${idx + 1}. ${vol.organizationName}`);
        if (vol.description) {
          lines.push(`   ${vol.description}`);
        }
        lines.push('');
      });
    }

    // Hobbies
    if (this.candidate.hobbies && this.candidate.hobbies.length > 0) {
      lines.push('HOBBIES & INTERESTS');
      lines.push('-'.repeat(60));
      lines.push(this.candidate.hobbies.join(', '));
      lines.push('');
    }

    return lines.join('\n');
  }
}
