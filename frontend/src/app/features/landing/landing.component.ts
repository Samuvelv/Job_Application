// src/app/features/landing/landing.component.ts
import {
  Component, HostListener, signal, inject, OnInit, OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ThemeService } from '../../core/services/theme.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  template: `
<!-- ══════════════════════════════════════════════
     NAVBAR
══════════════════════════════════════════════ -->
<header class="lp-nav" [class.lp-nav--scrolled]="scrolled">
  <div class="lp-nav__inner">

    <!-- Logo -->
    <a class="lp-nav__logo" href="#">
      <span class="lp-nav__logo-icon"><i class="bi bi-briefcase-fill"></i></span>
      <span class="lp-nav__logo-text">Talent<span>Hub</span></span>
    </a>

    <!-- Desktop links -->
    <nav class="lp-nav__links">
      <a href="#features">Features</a>
      <a href="#how-it-works">How It Works</a>
      <a href="#contact">Contact</a>
    </nav>

    <!-- Actions -->
    <div class="lp-nav__actions">
      <button class="lp-nav__theme-btn" (click)="theme.toggle()" [title]="theme.isDark() ? 'Switch to light' : 'Switch to dark'">
        <i class="bi" [class.bi-sun-fill]="theme.isDark()" [class.bi-moon-fill]="!theme.isDark()"></i>
      </button>
      <a class="lp-btn-primary lp-btn--sm" routerLink="/login">Sign In</a>
    </div>

    <!-- Hamburger -->
    <button class="lp-nav__hamburger" (click)="mobileOpen.set(!mobileOpen())">
      <i class="bi" [class.bi-list]="!mobileOpen()" [class.bi-x-lg]="mobileOpen()"></i>
    </button>
  </div>

  <!-- Mobile drawer -->
  @if (mobileOpen()) {
    <div class="lp-nav__mobile-drawer">
      <a href="#features"     (click)="mobileOpen.set(false)">Features</a>
      <a href="#how-it-works" (click)="mobileOpen.set(false)">How It Works</a>
      <a href="#contact"      (click)="mobileOpen.set(false)">Contact</a>
      <div class="lp-nav__mobile-actions">
        <button class="lp-nav__theme-btn" (click)="theme.toggle()">
          <i class="bi" [class.bi-sun-fill]="theme.isDark()" [class.bi-moon-fill]="!theme.isDark()"></i>
          {{ theme.isDark() ? 'Light Mode' : 'Dark Mode' }}
        </button>
        <a class="lp-btn-primary" routerLink="/login" (click)="mobileOpen.set(false)">Sign In</a>
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
      <!-- <div class="lp-hero__badge">
        <span class="lp-hero__badge-dot"></span>
        The Smart Hiring Platform
      </div> -->

      <h1 class="lp-hero__headline">
        <span class="lp-hero__headline-line1">Find Your <span class="lp-hero__headline-gradient">Sponsored Job Abroad</span></span>
        <span class="lp-hero__headline-line2"><span class="lp-hero__headline-gradient">We Handle Everything</span> For You</span>
      </h1>

      <p class="lp-hero__sub">
        Register once. Our team personally matches your profile to visa-sponsored employers across Europe, UK, Canada, Australia and more. One-time registration fee. No hidden charges. Zero stress.
      </p>

      <div class="lp-hero__ctas">
        <a class="lp-btn-primary lp-btn--lg" routerLink="/login">
          <i class="bi bi-search me-2"></i>Find a Job
        </a>
        <a class="lp-btn-outline lp-btn--lg" routerLink="/login">
          <i class="bi bi-building me-2"></i>Hire Talent
        </a>
      </div>

      <!-- Country flags row -->
      <div class="lp-countries">
        <div class="lp-countries__header">
          <span class="lp-countries__dot"></span>
          <p class="lp-countries__label">We connect candidates to sponsor-licensed employers in</p>
          <span class="lp-countries__dot"></span>
        </div>
        <div class="lp-countries__track-wrap">
          <div class="lp-countries__row">
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
        <span class="lp-hero__trust-text">Verified candidates &amp; employers only — <strong>fully secure platform</strong></span>
      </div>

      <!-- Floating mini stats -->
      <div class="lp-hero__mini-stats">
        <div class="lp-hero__mini-stat">
          <span class="lp-hero__mini-stat-num">500+</span>
          <span class="lp-hero__mini-stat-label">Candidates</span>
        </div>
        <div class="lp-hero__mini-stat-sep"></div>
        <div class="lp-hero__mini-stat">
          <span class="lp-hero__mini-stat-num">120+</span>
          <span class="lp-hero__mini-stat-label">Companies</span>
        </div>
        <div class="lp-hero__mini-stat-sep"></div>
        <div class="lp-hero__mini-stat">
          <span class="lp-hero__mini-stat-num">98%</span>
          <span class="lp-hero__mini-stat-label">Satisfaction</span>
        </div>
      </div>
    </div>

  </div>

  <!-- Wave divider -->
  <div class="lp-hero__wave">
    <svg viewBox="0 0 1440 80" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M0,40 C360,80 1080,0 1440,40 L1440,80 L0,80 Z" fill="var(--lp-section-bg)"/>
    </svg>
  </div>
</section>

<!-- ══════════════════════════════════════════════
     STATS BAR
══════════════════════════════════════════════ -->
<section class="lp-stats">
  <div class="lp-container lp-stats__grid">
    @for (s of stats; track s.label) {
      <div class="lp-stats__item">
        <div class="lp-stats__icon"><i class="bi {{ s.icon }}"></i></div>
        <div class="lp-stats__num">{{ s.value }}</div>
        <div class="lp-stats__label">{{ s.label }}</div>
      </div>
    }
  </div>
</section>

<!-- ══════════════════════════════════════════════
     FEATURES
══════════════════════════════════════════════ -->
<section class="lp-features" id="features">
  <div class="lp-container">
    <div class="lp-section-header">
      <div class="lp-section-eyebrow">Features</div>
      <h2 class="lp-section-title">Everything you need to hire — or be hired</h2>
      <p class="lp-section-sub">Powerful tools for candidates and recruiters, all in one place.</p>
    </div>

    <div class="lp-features__grid">
      @for (f of features; track f.title) {
        <div class="lp-feature-card" [class.lp-feature-card--recruiter]="f.forRecruiter">
          <div class="lp-feature-card__icon-wrap" [style.background]="f.gradient">
            <i class="bi {{ f.icon }}"></i>
          </div>
          <div class="lp-feature-card__tag">{{ f.forRecruiter ? 'For Recruiters' : 'For Candidates' }}</div>
          <h3 class="lp-feature-card__title">{{ f.title }}</h3>
          <p class="lp-feature-card__desc">{{ f.desc }}</p>
          <ul class="lp-feature-card__chips">
            @for (chip of f.chips; track chip) {
              <li>{{ chip }}</li>
            }
          </ul>
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
      <div class="lp-section-eyebrow">Process</div>
      <h2 class="lp-section-title">How It Works — 3 Simple Steps</h2>
      <p class="lp-section-sub">Register once and let our team do the heavy lifting — from profile building to employer introductions.</p>
    </div>

    <!-- Tab toggle -->
    <div class="lp-hiw__tabs">
      <button class="lp-hiw__tab" [class.active]="activeTab() === 'candidate'"
        (click)="activeTab.set('candidate')">
        <i class="bi bi-person-fill me-2"></i>I'm a Candidate
      </button>
      <button class="lp-hiw__tab" [class.active]="activeTab() === 'recruiter'"
        (click)="activeTab.set('recruiter')">
        <i class="bi bi-building me-2"></i>I'm a Recruiter
      </button>
    </div>

    <!-- Steps -->
    <div class="lp-hiw__steps">
      @if (activeTab() === 'candidate') {
        @for (step of candidateSteps; track step.title) {
          <div class="lp-hiw__step">
            <div class="lp-hiw__step-num">{{ $index + 1 }}</div>
            <div class="lp-hiw__step-icon"><i class="bi {{ step.icon }}"></i></div>
            <h4 class="lp-hiw__step-title">{{ step.title }}</h4>
            <p class="lp-hiw__step-desc">{{ step.desc }}</p>
          </div>
        }
      } @else {
        @for (step of recruiterSteps; track step.title) {
          <div class="lp-hiw__step">
            <div class="lp-hiw__step-num">{{ $index + 1 }}</div>
            <div class="lp-hiw__step-icon"><i class="bi {{ step.icon }}"></i></div>
            <h4 class="lp-hiw__step-title">{{ step.title }}</h4>
            <p class="lp-hiw__step-desc">{{ step.desc }}</p>
          </div>
        }
      }
    </div>

    <!-- Connector line (desktop) -->
    <div class="lp-hiw__connector"></div>

    <div class="lp-hiw__cta">
      <a class="lp-btn-primary lp-btn--lg" routerLink="/login">
        Get Started — It's Free <i class="bi bi-arrow-right ms-2"></i>
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
      <div class="lp-section-eyebrow">Success Stories</div>
      <h2 class="lp-section-title">What our community says</h2>
    </div>

    <div class="lp-testimonials__grid">
      @for (t of testimonials; track t.name) {
        <div class="lp-testimonial-card">
          <div class="lp-testimonial-card__stars">
            <i class="bi bi-star-fill"></i><i class="bi bi-star-fill"></i>
            <i class="bi bi-star-fill"></i><i class="bi bi-star-fill"></i>
            <i class="bi bi-star-fill"></i>
          </div>
          <p class="lp-testimonial-card__quote">"{{ t.quote }}"</p>
          <div class="lp-testimonial-card__author">
            <div class="lp-testimonial-card__avatar" [style.background]="t.color">
              {{ t.initials }}
            </div>
            <div>
              <div class="lp-testimonial-card__name">{{ t.name }}</div>
              <div class="lp-testimonial-card__role">{{ t.role }}</div>
            </div>
          </div>
        </div>
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
      <div class="lp-section-eyebrow">Contact Us</div>
      <h2 class="lp-section-title">Let's start a conversation</h2>
      <p class="lp-section-sub">Have questions or need help? We'd love to hear from you.</p>
    </div>

    <div class="lp-contact__inner">

      <!-- Info column -->
      <div class="lp-contact__info">
        <div class="lp-contact__info-card">
          <!-- Contact channels -->
          <div class="lp-contact__info-items">
            @for (item of contactInfoChannels; track item.label) {
              <div class="lp-contact__info-item">
                <div class="lp-contact__info-icon">
                  <i class="bi {{ item.icon }}"></i>
                </div>
                <div>
                  <div class="lp-contact__info-label">{{ item.label }}</div>
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
            @for (item of contactInfoDetails; track item.label) {
              <div class="lp-contact__info-item">
                <div class="lp-contact__info-icon">
                  <i class="bi {{ item.icon }}"></i>
                </div>
                <div>
                  <div class="lp-contact__info-label">{{ item.label }}</div>
                  <div class="lp-contact__info-value">{{ item.value }}</div>
                </div>
              </div>
            }
          </div>

          <div class="lp-contact__divider"></div>

          <p class="lp-contact__tagline">
            We help you find your sponsored job abroad — personally, professionally, step by step.
            Reach out in Tamil or English, we're here for you.
          </p>

          <div class="lp-contact__social">
            <a class="lp-contact__social-btn" href="https://wa.me/919360454326" target="_blank" title="WhatsApp">
              <i class="bi bi-whatsapp"></i>
            </a>
            <a class="lp-contact__social-btn" href="https://www.youtube.com/@namakal2london" target="_blank" title="YouTube">
              <i class="bi bi-youtube"></i>
            </a>
            <a class="lp-contact__social-btn" href="mailto:ntlcustomerservicecenter@gmail.com" title="Email">
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
              <label>Full Name</label>
              <input formControlName="name" type="text" placeholder="Your full name"
                [class.is-invalid]="contactInvalid('name')">
              @if (contactInvalid('name')) {
                <span class="lp-contact__form-error">Name is required.</span>
              }
            </div>
            <div class="lp-contact__form-group">
              <label>Email Address</label>
              <input formControlName="email" type="email" placeholder="you@example.com"
                [class.is-invalid]="contactInvalid('email')">
              @if (contactInvalid('email')) {
                <span class="lp-contact__form-error">Enter a valid email.</span>
              }
            </div>
          </div>

          <div class="lp-contact__form-group">
            <label>Subject</label>
            <select formControlName="subject">
              <option value="">Select a subject…</option>
              <option value="general">General Enquiry</option>
              <option value="job">Looking for a Job</option>
              <option value="hire">Looking to Hire</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div class="lp-contact__form-group">
            <label>Message</label>
            <textarea formControlName="message" rows="5" placeholder="Tell us how we can help…"
              [class.is-invalid]="contactInvalid('message')"></textarea>
            @if (contactInvalid('message')) {
              <span class="lp-contact__form-error">Message is required.</span>
            }
          </div>

          <button type="submit" class="lp-btn-primary lp-btn--full" [disabled]="contactSending">
            @if (contactSending) {
              <span class="spinner-border spinner-border-sm me-2"></span>Sending…
            } @else {
              <i class="bi bi-send-fill me-2"></i>Send Message
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
      <div class="lp-footer__logo">
        <span class="lp-footer__logo-icon"><i class="bi bi-briefcase-fill"></i></span>
        <span>Talent<span>Hub</span></span>
      </div>
      <p class="lp-footer__tagline">
        Bridging talent and opportunity — one career at a time.
      </p>
      <p class="lp-footer__copy">© {{ year }} TalentHub. All rights reserved.</p>
    </div>

    <!-- Quick links -->
    <div class="lp-footer__links">
      <div class="lp-footer__links-group">
        <div class="lp-footer__links-heading">Platform</div>
        <a href="#features">Features</a>
        <a href="#how-it-works">How It Works</a>
        <a href="#contact">Contact</a>
        <a routerLink="/login">Sign In</a>
      </div>
      <div class="lp-footer__links-group">
        <div class="lp-footer__links-heading">For Candidates</div>
        <a routerLink="/login">Create Profile</a>
        <a routerLink="/login">Browse Jobs</a>
        <a routerLink="/login">View Volunteers</a>
      </div>
      <div class="lp-footer__links-group">
        <div class="lp-footer__links-heading">For Recruiters</div>
        <a routerLink="/login">Post a Role</a>
        <a routerLink="/login">Search Talent</a>
        <a routerLink="/login">Manage Shortlist</a>
      </div>
    </div>

    <!-- CTA block -->
    <div class="lp-footer__cta-block">
      <div class="lp-footer__cta-heading">Ready to get started?</div>
      <p class="lp-footer__cta-sub">Join TalentHub and find your next big opportunity.</p>
      <a class="lp-btn-primary" routerLink="/login">Sign In <i class="bi bi-arrow-right ms-2"></i></a>
    </div>

  </div>

  <div class="lp-footer__bottom">
    <div class="lp-container lp-footer__bottom-inner">
      <span>Made with <i class="bi bi-heart-fill" style="color:#f43f5e"></i> by TalentHub</span>
      <div class="lp-footer__bottom-links">
        <a href="#">Privacy Policy</a>
        <a href="#">Terms of Service</a>
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

  scrolled   = false;
  mobileOpen = signal(false);
  activeTab  = signal<'candidate' | 'recruiter'>('candidate');
  contactSending = false;
  year = new Date().getFullYear();

  contactForm!: FormGroup;

  // ── Mock data ──────────────────────────────────────────────────────────────

  mockCandidates = [
    { initials: 'SJ', name: 'Sarah Johnson',  role: 'UX Designer',         match: '96%', color: 'var(--th-gradient-pink)' },
    { initials: 'MC', name: 'Michael Chen',   role: 'Backend Engineer',    match: '91%', color: 'var(--th-gradient-teal)' },
    { initials: 'PR', name: 'Priya Ramesh',   role: 'Product Manager',     match: '88%', color: 'var(--th-gradient-orange)' },
  ];

  stats = [
    { icon: 'bi-people-fill',        value: '500+',  label: 'Active Candidates'   },
    { icon: 'bi-building',           value: '120+',  label: 'Partner Companies'   },
    { icon: 'bi-lightning-charge-fill', value: '1,200+', label: 'Matches Made'   },
    { icon: 'bi-star-fill',          value: '98%',   label: 'Satisfaction Rate'   },
  ];

  features = [
    {
      icon: 'bi-person-lines-fill',
      gradient: 'var(--th-gradient-primary)',
      title: 'Smart Profile Builder',
      desc: 'Create a rich, detailed profile with skills, languages, and experience — everything recruiters need to say yes.',
      chips: ['Skills & Languages', 'Work History', 'Certifications'],
      forRecruiter: false,
    },
    {
      icon: 'bi-search-heart',
      gradient: 'var(--th-gradient-purple)',
      title: 'AI-Matched Opportunities',
      desc: 'Our matching engine surfaces the most relevant roles and recruiters based on your unique profile.',
      chips: ['Smart Matching', 'Relevance Score', 'Real-time Alerts'],
      forRecruiter: false,
    },
    {
      icon: 'bi-shield-check',
      gradient: 'var(--th-gradient-teal)',
      title: 'Privacy-First Contact',
      desc: 'Your contact details are private by default. Recruiters must request access, and you stay in control.',
      chips: ['Gated Contact Info', 'Request Approval', 'Full Control'],
      forRecruiter: false,
    },
    {
      icon: 'bi-funnel-fill',
      gradient: 'var(--th-gradient-orange)',
      title: 'Advanced Talent Search',
      desc: 'Filter candidates by skill, experience level, location, and availability to find exactly who you need.',
      chips: ['50+ Filters', 'Skill Search', 'Instant Results'],
      forRecruiter: true,
    },
    {
      icon: 'bi-bookmark-star-fill',
      gradient: 'var(--th-gradient-rose)',
      title: 'Shortlist Management',
      desc: 'Save and organise candidates into shortlists. Compare profiles side-by-side and move fast.',
      chips: ['Unlimited Shortlists', 'Side-by-side View', 'Quick Actions'],
      forRecruiter: true,
    },
    {
      icon: 'bi-envelope-check-fill',
      gradient: 'var(--th-gradient-success)',
      title: 'Verified Contact Requests',
      desc: 'Request direct access to candidate contact info with a single click. Approved by admin for full transparency.',
      chips: ['Verified Access', 'Admin Approval', 'Audit Trail'],
      forRecruiter: true,
    },
  ];

  candidateSteps = [
    { icon: 'bi-person-plus-fill',       title: 'Register & Pay',                      desc: 'Create your account and complete your registration. Our team will contact you within 24 hours to begin your profile setup.' },
    { icon: 'bi-people-fill',            title: 'We Build & Match Your Profile',       desc: 'Our team personally reviews your background, builds your professional profile, and matches you to visa-sponsored employers in your chosen country.' },
    { icon: 'bi-send-fill',              title: 'We Make the Introduction',            desc: 'We forward your profile directly to matched employers, arrange the interview introduction, and guide you through the visa process step by step.' },
  ];

  recruiterSteps = [
    { icon: 'bi-building-add',       title: 'Set Up Your Account',      desc: 'Admins create your recruiter profile and grant you access to the talent pool immediately.' },
    { icon: 'bi-funnel',             title: 'Search & Shortlist',       desc: 'Use powerful filters to find candidates that match your requirements. Save the best to your shortlist.' },
    { icon: 'bi-envelope-arrow-up-fill', title: 'Request & Hire',       desc: 'Request contact info for your top candidates. Once approved, reach out directly and make the hire.' },
  ];

  testimonials = [
    {
      quote: 'TalentHub made finding the right frontend role incredibly simple. Within two weeks I had three interview requests from companies I genuinely wanted to work for.',
      name: 'Anjali Sharma', role: 'Frontend Developer, Hired via TalentHub',
      initials: 'AS', color: 'var(--th-gradient-pink)',
    },
    {
      quote: 'The contact-request system is brilliant. Candidates feel safe and I get verified access without any friction. Best hiring tool we\'ve used this year.',
      name: 'David Park', role: 'Head of Engineering, TechCorp',
      initials: 'DP', color: 'var(--th-gradient-teal)',
    },
    {
      quote: 'I was skeptical about yet another jobs platform, but TalentHub\'s profile system is genuinely detailed. Recruiters could see my full skill set without a back-and-forth.',
      name: 'Ravi Kumar', role: 'Full-Stack Engineer, Placed in 3 weeks',
      initials: 'RK', color: 'var(--th-gradient-orange)',
    },
    {
      quote: 'Managing our hiring pipeline through TalentHub has cut our time-to-hire in half. The shortlist and contact workflow is exactly what we needed.',
      name: 'Sophie Martin', role: 'HR Manager, StartupX',
      initials: 'SM', color: 'var(--th-gradient-purple)',
    },
  ];

  contactInfoChannels = [
    { icon: 'bi-whatsapp',       label: 'WhatsApp', value: '+91 93604 54326',                      href: 'https://wa.me/919360454326?text=Hi%2C%20I%20would%20like%20to%20know%20more%20about%20TalentHub' },
    { icon: 'bi-telephone-fill', label: 'Call Us',  value: '+91 82485 38157',                      href: 'tel:+918248538157' },
    { icon: 'bi-envelope-fill',  label: 'Email',    value: 'ntlcustomerservicecenter@gmail.com',   href: 'mailto:ntlcustomerservicecenter@gmail.com' },
    { icon: 'bi-youtube',        label: 'YouTube',  value: '@namakal2london',                      href: 'https://www.youtube.com/@namakal2london' },
  ];

  contactInfoDetails = [
    { icon: 'bi-geo-alt-fill', label: 'Location', value: 'UK  |  Namakkal, Tamil Nadu, India' },
    { icon: 'bi-clock-fill',   label: 'Hours',    value: 'Monday – Saturday · 10:00 AM – 6:00 PM IST' },
    { icon: 'bi-translate',    label: 'Support',  value: 'Tamil & English — both available' },
  ];

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.contactForm = this.fb.group({
      name:    ['', Validators.required],
      email:   ['', [Validators.required, Validators.email]],
      subject: [''],
      message: ['', Validators.required],
    });
  }

  ngOnDestroy(): void {}

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
    setTimeout(() => {
      this.contactSending = false;
      this.contactForm.reset();
      this.toast.success('Message received! We\'ll be in touch soon.');
    }, 900);
  }
}
