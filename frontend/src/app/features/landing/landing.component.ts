// src/app/features/landing/landing.component.ts
import {
  Component, HostListener, signal, inject, OnInit, OnDestroy, ViewChild, ElementRef, computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  ReactiveFormsModule, FormBuilder, FormGroup, Validators,
  AbstractControl, ValidationErrors, ValidatorFn,
} from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ThemeService } from '../../core/services/theme.service';
import { LanguageSelectorComponent } from '../../shared/components/language-selector/language-selector.component';
import { ToastService } from '../../core/services/toast.service';
import { StatsService } from '../../core/services/stats.service';
import { ContactSubmissionService } from '../../core/services/contact-submission.service';
import { MasterDataService } from '../../core/services/master-data.service';
import { SearchableSelectComponent, SelectOption } from '../../shared/components/searchable-select/searchable-select.component';

// ── Phone rules (same as candidate form) ─────────────────────────────────────
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
function getPhoneRule(dialCode: string): PhoneRule { return PHONE_RULES[dialCode] ?? PHONE_FALLBACK; }

// Optional phone validator — only validates when phone has a value
function makeOptionalPhoneValidator(dialCtrl: string, numCtrl: string): ValidatorFn {
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

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, SearchableSelectComponent, TranslateModule, LanguageSelectorComponent],
  template: `
<!-- ══════════════════════════════════════════════
     NAVBAR
══════════════════════════════════════════════ -->
<header class="lp-nav" [class.lp-nav--scrolled]="scrolled">
  <div class="lp-nav__inner">

    <!-- Logo -->
    <a class="lp-nav__logo" href="#">
      <span class="lp-nav__logo-icon"><i class="bi bi-briefcase-fill"></i></span>
      <span class="lp-nav__logo-text">NTL Career <span>Nexus</span></span>
    </a>

    <!-- Desktop links -->
    <nav class="lp-nav__links">
      <a href="#features">{{ 'LANDING.nav_features' | translate }}</a>
      <a href="#how-it-works">{{ 'LANDING.nav_how_it_works' | translate }}</a>
      <a href="#contact">{{ 'LANDING.nav_contact' | translate }}</a>
    </nav>

    <!-- Actions -->
      <div class="lp-nav__actions">
        <app-language-selector></app-language-selector>
        <button class="lp-nav__theme-btn" (click)="theme.toggle()" [title]="theme.isDark() ? ('LANDING.light_mode' | translate) : ('LANDING.dark_mode' | translate)">
          <i class="bi" [class.bi-sun-fill]="theme.isDark()" [class.bi-moon-fill]="!theme.isDark()"></i>
        </button>
        <a class="lp-nav__signin" routerLink="/login">{{ 'LANDING.sign_in' | translate }}</a>
      <div class="lp-nav__register-wrap" (click)="$event.stopPropagation()">
        <button class="lp-btn-primary lp-btn--sm lp-nav__register-btn"
                [class.lp-nav__register-btn--open]="registerOpen()"
                (click)="registerOpen.set(!registerOpen())">
          {{ 'LANDING.register' | translate }}
          <i class="bi bi-chevron-down lp-nav__register-chevron"></i>
        </button>

        @if (registerOpen()) {
          <div class="lp-reg-drop" role="menu" [attr.aria-label]="'LANDING.register' | translate">
            <a class="lp-reg-drop__option" role="menuitem"
               routerLink="/login" [queryParams]="{role:'candidate'}"
               (click)="registerOpen.set(false)">
              <i class="bi bi-person-fill lp-reg-drop__icon lp-reg-drop__icon--candidate"></i>
              <span class="lp-reg-drop__title">{{ 'LANDING.i_am_candidate' | translate }}</span>
            </a>
            <a class="lp-reg-drop__option" role="menuitem"
               routerLink="/login" [queryParams]="{role:'recruiter'}"
               (click)="registerOpen.set(false)">
              <i class="bi bi-briefcase-fill lp-reg-drop__icon lp-reg-drop__icon--recruiter"></i>
              <span class="lp-reg-drop__title">{{ 'LANDING.i_am_recruiter' | translate }}</span>
            </a>
          </div>
        }
      </div>
    </div>

    <!-- Hamburger -->
    <button class="lp-nav__hamburger" (click)="mobileOpen.set(!mobileOpen())">
      <i class="bi" [class.bi-list]="!mobileOpen()" [class.bi-x-lg]="mobileOpen()"></i>
    </button>
  </div>

  <!-- Mobile drawer -->
  @if (mobileOpen()) {
    <div class="lp-nav__mobile-drawer">
      <a href="#features"     (click)="mobileOpen.set(false)">{{ 'LANDING.nav_features' | translate }}</a>
      <a href="#how-it-works" (click)="mobileOpen.set(false)">{{ 'LANDING.nav_how_it_works' | translate }}</a>
      <a href="#contact"      (click)="mobileOpen.set(false)">{{ 'LANDING.nav_contact' | translate }}</a>
      <div class="lp-nav__mobile-actions">
        <button class="lp-nav__theme-btn" (click)="theme.toggle()">
          <i class="bi" [class.bi-sun-fill]="theme.isDark()" [class.bi-moon-fill]="!theme.isDark()"></i>
          {{ theme.isDark() ? ('LANDING.light_mode' | translate) : ('LANDING.dark_mode' | translate) }}
        </button>
        <a class="lp-btn-outline" routerLink="/login" (click)="mobileOpen.set(false)">{{ 'LANDING.sign_in' | translate }}</a>
        <a class="lp-btn-primary" routerLink="/login" [queryParams]="{role:'candidate'}" (click)="mobileOpen.set(false)">
          <i class="bi bi-person-fill me-1"></i> {{ 'LANDING.register_as_candidate' | translate }}
        </a>
        <a class="lp-btn-primary" routerLink="/login" [queryParams]="{role:'recruiter'}" (click)="mobileOpen.set(false)">
          <i class="bi bi-building me-1"></i> {{ 'LANDING.register_as_recruiter' | translate }}
        </a>
      </div>
    </div>
  }
</header>

<!-- ══════════════════════════════════════════════
     HERO
══════════════════════════════════════════════ -->
<section class="lp-hero" id="home">
  <!-- Animated background orbs -->
  <div class="lp-hero__orb lp-hero__orb--1"></div>
  <div class="lp-hero__orb lp-hero__orb--2"></div>
  <div class="lp-hero__orb lp-hero__orb--3"></div>
  <div class="lp-hero__orb lp-hero__orb--4"></div>
  <!-- Dot background -->
  <div class="lp-hero__dots"></div>


  <div class="lp-container lp-hero__inner">

    <!-- Left: copy -->
    <div class="lp-hero__copy">
      <h1 class="lp-hero__headline">
        <span class="lp-hero__headline-line1">{{ 'LANDING.hero_line1' | translate }} <span class="lp-hero__headline-gradient">{{ 'LANDING.hero_gradient1' | translate }}</span></span>
        <span class="lp-hero__headline-line2"><span class="lp-hero__headline-gradient">{{ 'LANDING.hero_line2' | translate }}</span> {{ 'LANDING.hero_gradient2' | translate }}</span>
      </h1>

      <p class="lp-hero__sub">{{ 'LANDING.hero_sub' | translate }}</p>

      <div class="lp-hero__ctas">
        <a class="lp-btn-primary lp-btn--lg" routerLink="/login">
          <i class="bi bi-search me-2"></i>{{ 'LANDING.find_a_job' | translate }}
        </a>
        <a class="lp-btn-outline lp-btn--lg" routerLink="/login">
          <i class="bi bi-building me-2"></i>{{ 'LANDING.hire_talent' | translate }}
        </a>
      </div>

      <!-- Country flags row -->
      <div class="lp-countries">
        <div class="lp-countries__header">
          <span class="lp-countries__dot"></span>
          <p class="lp-countries__label">{{ 'LANDING.countries_label' | translate }}</p>
          <span class="lp-countries__dot"></span>
        </div>
        <div class="lp-countries__track-wrap">
          <div class="lp-countries__row" #countriesTrack>
            <div class="lp-countries__item">
              <div class="lp-countries__flag-wrap"><img src="https://flagcdn.com/w40/de.png" alt="Germany"></div>
              <span class="lp-countries__name">Germany</span>
            </div>
            <div class="lp-countries__item">
              <div class="lp-countries__flag-wrap"><img src="https://flagcdn.com/w40/gb.png" alt="UK"></div>
              <span class="lp-countries__name">UK</span>
            </div>
            <div class="lp-countries__item">
              <div class="lp-countries__flag-wrap"><img src="https://flagcdn.com/w40/nl.png" alt="Netherlands"></div>
              <span class="lp-countries__name">Netherlands</span>
            </div>
            <div class="lp-countries__item">
              <div class="lp-countries__flag-wrap"><img src="https://flagcdn.com/w40/ca.png" alt="Canada"></div>
              <span class="lp-countries__name">Canada</span>
            </div>
            <div class="lp-countries__item">
              <div class="lp-countries__flag-wrap"><img src="https://flagcdn.com/w40/au.png" alt="Australia"></div>
              <span class="lp-countries__name">Australia</span>
            </div>
            <div class="lp-countries__item">
              <div class="lp-countries__flag-wrap"><img src="https://flagcdn.com/w40/pt.png" alt="Portugal"></div>
              <span class="lp-countries__name">Portugal</span>
            </div>
            <div class="lp-countries__item">
              <div class="lp-countries__flag-wrap"><img src="https://flagcdn.com/w40/sg.png" alt="Singapore"></div>
              <span class="lp-countries__name">Singapore</span>
            </div>
            <div class="lp-countries__item">
              <div class="lp-countries__flag-wrap"><img src="https://flagcdn.com/w40/my.png" alt="Malaysia"></div>
              <span class="lp-countries__name">Malaysia</span>
            </div>
            <div class="lp-countries__item">
              <div class="lp-countries__flag-wrap"><img src="https://flagcdn.com/w40/nz.png" alt="New Zealand"></div>
              <span class="lp-countries__name">New Zealand</span>
            </div>
            <div class="lp-countries__item">
              <div class="lp-countries__flag-wrap"><img src="https://flagcdn.com/w40/ae.png" alt="Gulf Countries"></div>
              <span class="lp-countries__name">Gulf Countries</span>
            </div>
          </div>
        </div>
      </div>

      <div class="lp-hero__trust-badge">
        <span class="lp-hero__trust-lock">
          <i class="bi bi-shield-lock-fill"></i>
        </span>
        <span class="lp-hero__trust-text">{{ 'LANDING.trust_badge' | translate }}</span>
      </div>
    </div>

  </div>

  <!-- Wave divider -->
  <div class="lp-hero__wave">
    <svg viewBox="0 0 1440 80" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M0,40 C360,80 1080,0 1440,40 L1440,80 L0,80 Z" fill="var(--lp-section-alt)"/>
    </svg>
  </div>
</section>

<!-- ══════════════════════════════════════════════
     TRUST STATEMENTS
══════════════════════════════════════════════ -->
<section class="lp-trust">
  <div class="lp-container">

    <div class="lp-section-header">
      <div class="lp-section-eyebrow">{{ 'LANDING.trust_commitment' | translate }}</div>
      <h2 class="lp-section-title">{{ 'LANDING.trust_title' | translate }}</h2>
      <p class="lp-section-sub">{{ 'LANDING.trust_sub' | translate }}</p>
    </div>

    <div class="lp-trust__grid">

      <div class="lp-trust__card lp-trust__card--indigo">
        <div class="lp-trust__icon-wrap lp-trust__icon-wrap--indigo">
          <i class="bi bi-patch-check-fill"></i>
        </div>
        <h3 class="lp-trust__title">{{ 'LANDING.trust_card1_title' | translate }}</h3>
        <p class="lp-trust__desc">{{ 'LANDING.trust_card1_desc' | translate }}</p>
      </div>

      <div class="lp-trust__card lp-trust__card--emerald">
        <div class="lp-trust__icon-wrap lp-trust__icon-wrap--emerald">
          <i class="bi bi-building-check"></i>
        </div>
        <h3 class="lp-trust__title">{{ 'LANDING.trust_card2_title' | translate }}</h3>
        <p class="lp-trust__desc">{{ 'LANDING.trust_card2_desc' | translate }}</p>
      </div>

      <div class="lp-trust__card lp-trust__card--teal">
        <div class="lp-trust__icon-wrap lp-trust__icon-wrap--teal">
          <i class="bi bi-globe2"></i>
        </div>
        <h3 class="lp-trust__title">{{ 'LANDING.trust_card3_title' | translate }}</h3>
        <p class="lp-trust__desc">{{ 'LANDING.trust_card3_desc' | translate }}</p>
      </div>

    </div>
  </div>
</section>

<!-- ══════════════════════════════════════════════
     FEATURES
══════════════════════════════════════════════ -->
<section class="lp-features" id="features">
  <div class="lp-container">
    <div class="lp-section-header">
      <div class="lp-section-eyebrow">{{ 'LANDING.features_eyebrow' | translate }}</div>
      <h2 class="lp-section-title">{{ 'LANDING.features_title' | translate }}</h2>
      <p class="lp-section-sub">{{ 'LANDING.features_sub' | translate }}</p>
    </div>

    <div class="lp-features__grid">
      @for (f of features; track f.titleKey) {
        <div class="lp-feature-card" [class.lp-feature-card--recruiter]="f.forRecruiter">
          <div class="lp-feature-card__icon-wrap" [style.background]="f.gradient">
            <i class="bi {{ f.icon }}"></i>
          </div>
          <div class="lp-feature-card__tag">{{ (f.forRecruiter ? 'LANDING.for_recruiters' : 'LANDING.for_candidates') | translate }}</div>
          <h3 class="lp-feature-card__title">{{ f.titleKey | translate }}</h3>
          <p class="lp-feature-card__desc">{{ f.descKey | translate }}</p>
          <ul class="lp-feature-card__chips">
            @for (chip of f.chipKeys; track chip) {
              <li>{{ chip | translate }}</li>
            }
          </ul>
        </div>
      }
    </div>
  </div>
</section>

<!-- ══════════════════════════════════════════════
     WHY NTL CAREER NEXUS IS DIFFERENT
══════════════════════════════════════════════ -->
<section class="lp-why" id="why-us">
  <div class="lp-container">
    <div class="lp-section-header">
      <div class="lp-section-eyebrow">{{ 'LANDING.why_us_eyebrow' | translate }}</div>
      <h2 class="lp-section-title">{{ 'LANDING.why_us_title' | translate }}</h2>
    </div>

    <div class="lp-features__grid">
      @for (w of whyDifferent; track w.titleKey) {
        <div class="lp-why__card" [style.--card-shadow]="w.shadow">
          <div class="lp-why__icon" [style.background]="w.color"><i class="bi {{ w.icon }}"></i></div>
          <h3 class="lp-why__title">{{ w.titleKey | translate }}</h3>
          <p class="lp-why__desc">{{ w.descKey | translate }}</p>
        </div>
      }
    </div>
  </div>
</section>

<!-- ══════════════════════════════════════════════
     HOW IT WORKS
══════════════════════════════════════════════ -->
<section class="lp-hiw" id="how-it-works">
  <div class="lp-container">
    <div class="lp-section-header">
      <div class="lp-section-eyebrow">{{ 'LANDING.hiw_eyebrow' | translate }}</div>
      <h2 class="lp-section-title">{{ 'LANDING.hiw_title' | translate }}</h2>
      <p class="lp-section-sub">{{ 'LANDING.hiw_sub' | translate }}</p>
    </div>

    <!-- Tab toggle -->
    <div class="lp-hiw__tabs">
      <button class="lp-hiw__tab" [class.active]="activeTab() === 'candidate'"
        (click)="activeTab.set('candidate')">
        <i class="bi bi-person-fill me-2"></i>{{ 'LANDING.im_a_candidate' | translate }}
      </button>
      <button class="lp-hiw__tab" [class.active]="activeTab() === 'recruiter'"
        (click)="activeTab.set('recruiter')">
        <i class="bi bi-building me-2"></i>{{ 'LANDING.im_a_recruiter' | translate }}
      </button>
    </div>

    <!-- Steps -->
    <div class="lp-hiw__steps">
      @if (activeTab() === 'candidate') {
        @for (step of candidateSteps; track step.titleKey) {
          <div class="lp-hiw__step" [style.--card-shadow]="step.shadow">
            <div class="lp-hiw__step-num">{{ $index + 1 }}</div>
            <div class="lp-hiw__step-icon" [style.background]="step.color"><i class="bi {{ step.icon }}"></i></div>
            <h4 class="lp-hiw__step-title">{{ step.titleKey | translate }}</h4>
            <p class="lp-hiw__step-desc">{{ step.descKey | translate }}</p>
          </div>
        }
      } @else {
        @for (step of recruiterSteps; track step.titleKey) {
          <div class="lp-hiw__step" [style.--card-shadow]="step.shadow">
            <div class="lp-hiw__step-num">{{ $index + 1 }}</div>
            <div class="lp-hiw__step-icon" [style.background]="step.color"><i class="bi {{ step.icon }}"></i></div>
            <h4 class="lp-hiw__step-title">{{ step.titleKey | translate }}</h4>
            <p class="lp-hiw__step-desc">{{ step.descKey | translate }}</p>
          </div>
        }
      }
    </div>

    <!-- Connector line (desktop) -->
    <div class="lp-hiw__connector"></div>

    <div class="lp-hiw__cta">
      <a class="lp-btn-primary lp-btn--lg" routerLink="/login">
        {{ 'LANDING.register_now' | translate }} <i class="bi bi-arrow-right ms-2"></i>
      </a>
    </div>
  </div>
</section>

<!-- ══════════════════════════════════════════════
     TESTIMONIALS
══════════════════════════════════════════════ -->
<section class="lp-testimonials">
  <div class="lp-container">
    <div class="lp-section-header">
      <div class="lp-section-eyebrow">{{ 'LANDING.testimonials_eyebrow' | translate }}</div>
      <h2 class="lp-section-title">{{ 'LANDING.testimonials_title' | translate }}</h2>
    </div>

    <div class="lp-tc__wrapper">

      <!-- Prev arrow -->
      <button class="lp-tc__arrow lp-tc__arrow--prev"
              (click)="prevTestimonial()"
              [disabled]="tcIndex() === 0"
              [attr.aria-label]="'LANDING.prev_testimonial' | translate">
        <i class="bi bi-chevron-left"></i>
      </button>

      <!-- Scrollable track -->
      <div class="lp-tc__track" #tcTrack (scroll)="onTrackScroll($event)">
        @for (t of testimonials; track t.nameKey) {
          <div class="lp-testimonial-card">
            <div class="lp-testimonial-card__stars">
              <i class="bi bi-star-fill"></i><i class="bi bi-star-fill"></i>
              <i class="bi bi-star-fill"></i><i class="bi bi-star-fill"></i>
              <i class="bi bi-star-fill"></i>
            </div>
            <p class="lp-testimonial-card__quote">"{{ t.quoteKey | translate }}"</p>
            <div class="lp-testimonial-card__author">
              <div class="lp-testimonial-card__avatar" [style.background]="t.color">
                {{ t.initials }}
              </div>
              <div>
                <div class="lp-testimonial-card__name">{{ t.nameKey | translate }}</div>
                <div class="lp-testimonial-card__role">{{ t.roleKey | translate }}</div>
            </div>
          </div>
          </div>
        }
      </div>

      <!-- Next arrow -->
      <button class="lp-tc__arrow lp-tc__arrow--next"
              (click)="nextTestimonial()"
              [disabled]="tcIndex() === maxTcIndex"
              [attr.aria-label]="'LANDING.next_testimonial' | translate">
        <i class="bi bi-chevron-right"></i>
      </button>

    </div>

    <!-- Dot indicators -->
    <div class="lp-tc__dots">
      @for (d of tcDots; track $index) {
        <button class="lp-tc__dot"
                [class.active]="tcIndex() === $index"
                (click)="goToTestimonial($index)"
                [attr.aria-label]="('LANDING.go_to_slide' | translate: { n: $index + 1 })">
        </button>
      }
    </div>

  </div>
</section>

<!-- ══════════════════════════════════════════════
     CONTACT
══════════════════════════════════════════════ -->
<section class="lp-contact" id="contact">
  <div class="lp-container">
    <div class="lp-section-header">
      <div class="lp-section-eyebrow">{{ 'LANDING.contact_eyebrow' | translate }}</div>
      <h2 class="lp-section-title">{{ 'LANDING.contact_title' | translate }}</h2>
      <p class="lp-section-sub">{{ 'LANDING.contact_sub' | translate }}</p>
    </div>

    <div class="lp-contact__inner">

      <!-- Info column -->
      <div class="lp-contact__info">
        <div class="lp-contact__info-card">
          <!-- Contact channels -->
          <div class="lp-contact__info-items">
            @for (item of contactInfoChannels; track item.labelKey) {
              <div class="lp-contact__info-item">
                <div class="lp-contact__info-icon">
                  <i class="bi {{ item.icon }}"></i>
                </div>
                <div>
                  <div class="lp-contact__info-label">{{ item.labelKey | translate }}</div>
                  @if (item.href) {
                    <a class="lp-contact__info-value lp-contact__info-link" [href]="item.href" target="_blank" rel="noopener noreferrer">{{ item.value }}</a>
                  } @else {
                    <div class="lp-contact__info-value">{{ item.value }}</div>
                  }
                </div>
              </div>
            }
          </div>

          <div class="lp-contact__divider"></div>

          <!-- Location & hours -->
          <div class="lp-contact__info-items">
            @for (item of contactInfoDetails; track item.labelKey) {
              <div class="lp-contact__info-item">
                <div class="lp-contact__info-icon">
                  <i class="bi {{ item.icon }}"></i>
                </div>
                <div>
                  <div class="lp-contact__info-label">{{ item.labelKey | translate }}</div>
                  <div class="lp-contact__info-value">{{ item.valueKey | translate }}</div>
                </div>
              </div>
            }
          </div>

          <div class="lp-contact__divider"></div>

          <p class="lp-contact__tagline">{{ 'LANDING.contact_tagline' | translate }}</p>

          <div class="lp-contact__social">
            <a class="lp-contact__social-btn" href="https://wa.me/919360454326" target="_blank" title="WhatsApp">
              <i class="bi bi-whatsapp"></i>
            </a>
            <a class="lp-contact__social-btn" href="mailto:hello@ntlcareernexus.com" title="Email">
              <i class="bi bi-envelope-fill"></i>
            </a>
          </div>
        </div>
      </div>

      <!-- Form column -->
      <div class="lp-contact__form-wrap">
        <form class="lp-contact__form" [formGroup]="contactForm" (ngSubmit)="submitContact()">

          <div class="lp-contact__form-row">
            <div class="lp-contact__form-group">
              <label>{{ 'LANDING.contact_full_name' | translate }}</label>
              <input formControlName="name" type="text" [placeholder]="'LANDING.contact_name_placeholder' | translate"
                [class.is-invalid]="contactInvalid('name')">
              @if (contactInvalid('name')) {
                <span class="lp-contact__form-error">{{ 'LANDING.contact_name_required' | translate }}</span>
              }
            </div>
            <div class="lp-contact__form-group">
              <label>{{ 'LANDING.contact_email_label' | translate }}</label>
              <input formControlName="email" type="email" [placeholder]="'LANDING.contact_email_placeholder' | translate"
                [class.is-invalid]="contactInvalid('email')">
              @if (contactInvalid('email')) {
                <span class="lp-contact__form-error">{{ 'LANDING.contact_email_invalid' | translate }}</span>
              }
            </div>
          </div>

          <div class="lp-contact__form-row">
            <div class="lp-contact__form-group">
              <label>{{ 'LANDING.contact_phone_label' | translate }} <span style="font-weight:400;color:var(--th-muted)">{{ 'LANDING.contact_phone_optional' | translate }}</span></label>
              <div class="phone-input-group">
                <app-searchable-select
                  formControlName="dial_code"
                  [options]="dialCodeOptions()"
                  placeholder="🌐"
                  class="dial-select">
                </app-searchable-select>
                <input type="tel" class="phone-number-input"
                  formControlName="phone"
                  placeholder="e.g. 9876543210"
                  [class.is-invalid]="contactInvalid('phone')">
              </div>
              @if (contactInvalid('phone')) {
                <span class="lp-contact__form-error">
                  {{ contactForm.get('phone')?.errors?.['phoneInvalid'] || ('LANDING.contact_phone_invalid' | translate) }}
                </span>
              }
            </div>
            <div class="lp-contact__form-group">
              <label>{{ 'LANDING.contact_subject' | translate }}</label>
              <app-searchable-select
                formControlName="subject"
                [options]="subjectOptions"
                [placeholder]="'LANDING.contact_subject_placeholder' | translate"
                [allowClear]="true">
              </app-searchable-select>
            </div>
          </div>

          <div class="lp-contact__form-group">
            <label>{{ 'LANDING.contact_message' | translate }}</label>
            <textarea formControlName="message" rows="5" [placeholder]="'LANDING.contact_message_placeholder' | translate"
              maxlength="1000"
              [class.is-invalid]="contactInvalid('message')"></textarea>
            @if (contactInvalid('message')) {
              <span class="lp-contact__form-error">{{ 'LANDING.contact_message_required' | translate }}</span>
            }
            <div class="lp-contact__char-count-row">
              <span class="lp-contact__char-count"
                [class.lp-contact__char-count--warn]="(contactForm.get('message')?.value?.length || 0) >= 800"
                [class.lp-contact__char-count--limit]="(contactForm.get('message')?.value?.length || 0) >= 950">
                {{ contactForm.get('message')?.value?.length || 0 }} / 1000
              </span>
            </div>
          </div>

          <button type="submit" class="lp-btn-primary lp-btn--full" [disabled]="contactSending">
            @if (contactSending) {
              <span class="spinner-border spinner-border-sm me-2"></span>{{ 'COMMON.sending' | translate }}
            } @else {
              <i class="bi bi-send-fill me-2"></i>{{ 'COMMON.send_message' | translate }}
            }
          </button>

        </form>
      </div>

    </div>
  </div>
</section>

<!-- ══════════════════════════════════════════════
     FOOTER
══════════════════════════════════════════════ -->
<footer class="lp-footer">
  <div class="lp-container lp-footer__inner">

    <!-- Brand -->
    <div class="lp-footer__brand">
      <a class="lp-nav__logo" href="#" style="margin-bottom:1rem">
        <span class="lp-nav__logo-icon"><i class="bi bi-briefcase-fill"></i></span>
        <span class="lp-nav__logo-text">NTL Career <span>Nexus</span></span>
      </a>
      <p class="lp-footer__tagline">{{ 'LANDING.footer_tagline' | translate }}</p>
      <p class="lp-footer__copy">© {{ year }} NTL Career Nexus. {{ 'LANDING.footer_all_rights' | translate }}</p>
    </div>

    <!-- Quick links -->
    <div class="lp-footer__links">
      <div class="lp-footer__links-group">
        <div class="lp-footer__links-heading">{{ 'LANDING.footer_platform' | translate }}</div>
        <a href="#features">{{ 'LANDING.nav_features' | translate }}</a>
        <a href="#how-it-works">{{ 'LANDING.nav_how_it_works' | translate }}</a>
        <a href="#contact">{{ 'LANDING.nav_contact' | translate }}</a>
        <a routerLink="/login">{{ 'LANDING.sign_in' | translate }}</a>
      </div>
      <div class="lp-footer__links-group">
        <div class="lp-footer__links-heading">{{ 'LANDING.footer_for_candidates' | translate }}</div>
        <a routerLink="/login">{{ 'LANDING.footer_how_to_register' | translate }}</a>
        <a routerLink="/login">{{ 'LANDING.footer_visa_sponsorship' | translate }}</a>
        <a href="#how-it-works">{{ 'LANDING.footer_target_countries' | translate }}</a>
        <a routerLink="/login">{{ 'LANDING.footer_view_volunteers' | translate }}</a>
      </div>
      <div class="lp-footer__links-group">
        <div class="lp-footer__links-heading">{{ 'LANDING.footer_for_recruiters' | translate }}</div>
        <a routerLink="/login">{{ 'LANDING.footer_register_recruiter' | translate }}</a>
        <a routerLink="/login">{{ 'LANDING.footer_search_candidates' | translate }}</a>
        <a href="#how-it-works">{{ 'LANDING.footer_how_it_works' | translate }}</a>
      </div>
    </div>

    <!-- CTA block -->
    <div class="lp-footer__cta-block">
      <div class="lp-footer__cta-heading">{{ 'LANDING.footer_ready' | translate }}</div>
      <p class="lp-footer__cta-sub">{{ 'LANDING.footer_ready_sub' | translate }}</p>
      <a class="lp-btn-primary" routerLink="/login">{{ 'LANDING.sign_in' | translate }} <i class="bi bi-arrow-right ms-2"></i></a>
    </div>

  </div>

  <div class="lp-footer__bottom">
    <div class="lp-container lp-footer__bottom-inner">
      <span>{{ 'LANDING.footer_made_with' | translate }} <i class="bi bi-heart-fill" style="color:#f43f5e"></i> {{ 'LANDING.footer_made_by' | translate }}</span>
      <div class="lp-footer__bottom-links">
        <a href="#">{{ 'LANDING.footer_privacy' | translate }}</a>
        <a href="#">{{ 'LANDING.footer_terms' | translate }}</a>
      </div>
    </div>
  </div>
</footer>
  `,
})
export class LandingComponent implements OnInit, OnDestroy {
  theme  = inject(ThemeService);
  private toast = inject(ToastService);
  private fb    = inject(FormBuilder);
  private statsService = inject(StatsService);
  private contactSvc   = inject(ContactSubmissionService);
  private master       = inject(MasterDataService);

  dialCodeOptions = computed<SelectOption[]>(() =>
    this.master.countries().map(c => ({ value: c.dial_code, label: `${c.flag_emoji} ${c.dial_code}`, sublabel: c.name }))
  );

  subjectOptions: SelectOption[] = [
    { value: 'general', label: 'LANDING.subject_general' },
    { value: 'job',     label: 'LANDING.subject_job' },
    { value: 'hire',    label: 'LANDING.subject_hire' },
    { value: 'other',   label: 'LANDING.subject_other' },
  ];

  scrolled      = false;
  mobileOpen    = signal(false);
  registerOpen  = signal(false);
  activeTab     = signal<'candidate' | 'recruiter'>('candidate');
  contactSending = false;
  year = new Date().getFullYear();

  // ── Testimonial carousel ───────────────────────────────────────────────────
  tcIndex = signal(0);
  @ViewChild('tcTrack') tcTrackRef!: ElementRef<HTMLDivElement>;

  private get cardsVisible(): number {
    return window.innerWidth <= 768 ? 1 : 3;
  }
  get maxTcIndex(): number {
    return Math.max(0, this.testimonials.length - this.cardsVisible);
  }
  get tcDots(): number[] {
    return Array.from({ length: this.maxTcIndex + 1 }, (_, i) => i);
  }
  private scrollToIndex(index: number): void {
    const track = this.tcTrackRef?.nativeElement;
    if (!track) return;
    const card = track.querySelector('.lp-testimonial-card') as HTMLElement;
    if (!card) return;
    const gap = parseFloat(getComputedStyle(track).gap) || 20;
    track.scrollTo({ left: index * (card.offsetWidth + gap), behavior: 'smooth' });
  }
  nextTestimonial(): void {
    const next = Math.min(this.tcIndex() + 1, this.maxTcIndex);
    this.tcIndex.set(next);
    this.scrollToIndex(next);
  }
  prevTestimonial(): void {
    const prev = Math.max(this.tcIndex() - 1, 0);
    this.tcIndex.set(prev);
    this.scrollToIndex(prev);
  }
  goToTestimonial(index: number): void {
    this.tcIndex.set(index);
    this.scrollToIndex(index);
  }
  onTrackScroll(event: Event): void {
    const track = event.target as HTMLDivElement;
    const card = track.querySelector('.lp-testimonial-card') as HTMLElement;
    if (!card) return;
    const gap = parseFloat(getComputedStyle(track).gap) || 20;
    const index = Math.round(track.scrollLeft / (card.offsetWidth + gap));
    this.tcIndex.set(Math.min(index, this.maxTcIndex));
  }

  @HostListener('window:resize')
  onResize(): void {
    const clamped = Math.min(this.tcIndex(), this.maxTcIndex);
    this.tcIndex.set(clamped);
    this.scrollToIndex(clamped);
  }

  readonly statsLoading = signal(true);
  readonly statsError   = signal(false);
  readonly stats        = signal<{ icon: string; value: string; label: string }[]>([]);
  readonly miniStats    = signal<{ num: string; label: string }[]>([]);

  contactForm!: FormGroup;

  // ── Data arrays (using translation keys) ──────────────────────────────────

  features = [
    {
      icon: 'bi-person-lines-fill',
      gradient: 'var(--th-gradient-primary)',
      titleKey: 'FEATURES.f1_title',
      descKey:  'FEATURES.f1_desc',
      chipKeys: ['FEATURES.f1_chip1', 'FEATURES.f1_chip2', 'FEATURES.f1_chip3'],
      forRecruiter: false,
    },
    {
      icon: 'bi-search-heart',
      gradient: 'var(--th-gradient-purple)',
      titleKey: 'FEATURES.f2_title',
      descKey:  'FEATURES.f2_desc',
      chipKeys: ['FEATURES.f2_chip1', 'FEATURES.f2_chip2', 'FEATURES.f2_chip3', 'FEATURES.f2_chip4', 'FEATURES.f2_chip5'],
      forRecruiter: false,
    },
    {
      icon: 'bi-shield-check',
      gradient: 'var(--th-gradient-teal)',
      titleKey: 'FEATURES.f3_title',
      descKey:  'FEATURES.f3_desc',
      chipKeys: ['FEATURES.f3_chip1', 'FEATURES.f3_chip2', 'FEATURES.f3_chip3'],
      forRecruiter: false,
    },
    {
      icon: 'bi-funnel-fill',
      gradient: 'var(--th-gradient-orange)',
      titleKey: 'FEATURES.f4_title',
      descKey:  'FEATURES.f4_desc',
      chipKeys: ['FEATURES.f4_chip1', 'FEATURES.f4_chip2', 'FEATURES.f4_chip3'],
      forRecruiter: true,
    },
    {
      icon: 'bi-bookmark-star-fill',
      gradient: 'var(--th-gradient-rose)',
      titleKey: 'FEATURES.f5_title',
      descKey:  'FEATURES.f5_desc',
      chipKeys: ['FEATURES.f5_chip1', 'FEATURES.f5_chip2', 'FEATURES.f5_chip3'],
      forRecruiter: true,
    },
    {
      icon: 'bi-envelope-check-fill',
      gradient: 'var(--th-gradient-success)',
      titleKey: 'FEATURES.f6_title',
      descKey:  'FEATURES.f6_desc',
      chipKeys: ['FEATURES.f6_chip1', 'FEATURES.f6_chip2', 'FEATURES.f6_chip3'],
      forRecruiter: true,
    },
  ];

  whyDifferent = [
    {
      icon: 'bi-shield-check',
      color: 'var(--th-gradient-primary)',
      shadow: 'rgba(80,70,229,.28)',
      titleKey: 'WHY.w1_title',
      descKey:  'WHY.w1_desc',
    },
    {
      icon: 'bi-people-fill',
      color: 'var(--th-gradient-teal)',
      shadow: 'rgba(20,184,166,.28)',
      titleKey: 'WHY.w2_title',
      descKey:  'WHY.w2_desc',
    },
    {
      icon: 'bi-globe2',
      color: 'var(--th-gradient-orange)',
      shadow: 'rgba(249,115,22,.28)',
      titleKey: 'WHY.w3_title',
      descKey:  'WHY.w3_desc',
    },
  ];

  candidateSteps = [
    { icon: 'bi-person-plus-fill', color: 'var(--th-gradient-primary)', shadow: 'rgba(80,70,229,.28)',  titleKey: 'STEPS.candidate1_title', descKey: 'STEPS.candidate1_desc' },
    { icon: 'bi-people-fill',      color: 'var(--th-gradient-teal)',    shadow: 'rgba(20,184,166,.28)', titleKey: 'STEPS.candidate2_title', descKey: 'STEPS.candidate2_desc' },
    { icon: 'bi-send-fill',        color: 'var(--th-gradient-pink)',    shadow: 'rgba(236,72,153,.28)', titleKey: 'STEPS.candidate3_title', descKey: 'STEPS.candidate3_desc' },
  ];

  recruiterSteps = [
    { icon: 'bi-building-add',           color: 'var(--th-gradient-primary)', shadow: 'rgba(80,70,229,.28)',  titleKey: 'STEPS.recruiter1_title', descKey: 'STEPS.recruiter1_desc' },
    { icon: 'bi-funnel',                 color: 'var(--th-gradient-orange)',  shadow: 'rgba(249,115,22,.28)', titleKey: 'STEPS.recruiter2_title', descKey: 'STEPS.recruiter2_desc' },
    { icon: 'bi-envelope-arrow-up-fill', color: 'var(--th-gradient-teal)',   shadow: 'rgba(20,184,166,.28)', titleKey: 'STEPS.recruiter3_title', descKey: 'STEPS.recruiter3_desc' },
  ];

  testimonials = [
    { quoteKey: 'TESTIMONIALS.t1_quote', nameKey: 'TESTIMONIALS.t1_name', roleKey: 'TESTIMONIALS.t1_role', initials: 'AS', color: 'var(--th-gradient-pink)'   },
    { quoteKey: 'TESTIMONIALS.t2_quote', nameKey: 'TESTIMONIALS.t2_name', roleKey: 'TESTIMONIALS.t2_role', initials: 'DP', color: 'var(--th-gradient-teal)'   },
    { quoteKey: 'TESTIMONIALS.t3_quote', nameKey: 'TESTIMONIALS.t3_name', roleKey: 'TESTIMONIALS.t3_role', initials: 'RK', color: 'var(--th-gradient-orange)' },
    { quoteKey: 'TESTIMONIALS.t4_quote', nameKey: 'TESTIMONIALS.t4_name', roleKey: 'TESTIMONIALS.t4_role', initials: 'SM', color: 'var(--th-gradient-purple)' },
  ];

  contactInfoChannels = [
    { icon: 'bi-whatsapp',       labelKey: 'LANDING.contact_channel_whatsapp', value: '+91 93604 54326',        href: 'https://wa.me/919360454326?text=Hi%2C%20I%20would%20like%20to%20know%20more%20about%20NTL%20Career%20Nexus' },
    { icon: 'bi-telephone-fill', labelKey: 'LANDING.contact_channel_call',     value: '+91 82485 38157',        href: 'tel:+918248538157' },
    { icon: 'bi-envelope-fill',  labelKey: 'LANDING.contact_channel_email',    value: 'hello@ntlcareernexus.com', href: 'mailto:hello@ntlcareernexus.com' },
  ];

  contactInfoDetails = [
    { icon: 'bi-geo-alt-fill', labelKey: 'LANDING.contact_detail_location', valueKey: 'LANDING.contact_location_value' },
    { icon: 'bi-clock-fill',   labelKey: 'LANDING.contact_detail_hours',    valueKey: 'LANDING.contact_hours_value'    },
    { icon: 'bi-translate',    labelKey: 'LANDING.contact_detail_support',  valueKey: 'LANDING.contact_support_value'  },
  ];

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  private formatCount(n: number): string {
    if (n >= 1000) return `${(Math.floor(n / 100) * 100).toLocaleString('en-US')}+`;
    if (n >= 100)  return `${Math.floor(n / 100) * 100}+`;
    if (n > 0)     return `${n}+`;
    return '0';
  }

  ngOnInit(): void {
    this.contactForm = this.fb.group({
      name:      ['', Validators.required],
      email:     ['', [Validators.required, Validators.email]],
      dial_code: ['+91'],
      phone:     [''],
      subject:   [''],
      message:   ['', [Validators.required, Validators.maxLength(1000)]],
    }, { validators: [makeOptionalPhoneValidator('dial_code', 'phone')] });

    this.master.loadAll();

    this.statsService.getPublicStats().subscribe({
      next: (s) => {
        this.stats.set([
          { icon: 'bi-people-fill',           value: this.formatCount(s.totalCandidates), label: 'Active Candidates' },
          { icon: 'bi-building',              value: this.formatCount(s.totalCompanies),  label: 'Partner Companies' },
          { icon: 'bi-lightning-charge-fill', value: this.formatCount(s.totalMatches),    label: 'Matches Made'      },
        ]);
        this.miniStats.set([
          { num: this.formatCount(s.totalCandidates), label: 'Candidates' },
          { num: this.formatCount(s.totalCompanies),  label: 'Companies'  },
          { num: this.formatCount(s.totalMatches),    label: 'Matches'    },
        ]);
        this.statsLoading.set(false);
      },
      error: () => {
        this.statsLoading.set(false);
        this.statsError.set(true);
      },
    });
  }

  ngOnDestroy(): void {}

  @HostListener('document:click')
  onDocumentClick(): void { this.registerOpen.set(false); }

  @HostListener('document:keydown.escape')
  onEscape(): void { this.registerOpen.set(false); }

  @HostListener('window:scroll')
  onScroll(): void {
    this.scrolled = window.scrollY > 40;
  }

  contactInvalid(field: string): boolean {
    const c = this.contactForm.get(field);
    return !!(c && c.invalid && c.touched);
  }

  submitContact(): void {
    if (this.contactForm.invalid) { this.contactForm.markAllAsTouched(); return; }
    this.contactSending = true;
    const { name, email, dial_code, phone, subject, message } = this.contactForm.value;
    const fullPhone = phone ? `${dial_code || ''}${phone}`.trim() : null;
    this.contactSvc.submit({ name, email, phone: fullPhone, subject, message }).subscribe({
      next: () => {
        this.contactSending = false;
        this.contactForm.reset();
        this.toast.success('Message received! We\'ll be in touch soon.');
      },
      error: () => {
        this.contactSending = false;
        this.toast.success('Message received! We\'ll be in touch soon.');
      },
    });
  }
}
