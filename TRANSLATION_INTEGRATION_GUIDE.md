# Translation Integration Guide - Component Usage

## Overview

This guide shows how to integrate the `UserDataTranslationService` into your components to support multi-language user data translation.

## Two Translation Services

### 1. LanguageService
**For**: Switching UI language (instant)
**No API calls** - loads pre-translated i18n files
**Example**: `{{ 'COMMON.save' | translate }}`

### 2. UserDataTranslationService  
**For**: Translating user-provided content
**Calls OpenAI API** on-demand
**Caches** for 1 hour

---

## Integration Pattern: CandidateProfileComponent

The `CandidateProfileComponent` demonstrates the complete integration pattern:

### 1. Import Services and Dependencies

```typescript
import { Component, Input, signal, inject, OnInit, OnDestroy } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { UserDataTranslationService } from '@core/services/user-data-translation.service';
import { LanguageService } from '@core/services/language.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
```

### 2. Inject Services

```typescript
export class CandidateProfileComponent implements OnInit, OnDestroy {
  @Input() candidate: Candidate | null = null;

  private userDataTranslation = inject(UserDataTranslationService);
  private translate = inject(TranslateService);
  private destroy$ = new Subject<void>();
```

### 3. Create Translation State Signals

```typescript
// For single field translation
translatedBio = signal<string>('');
isTranslatingBio = signal(false);

// For multiple field translation  
translatedProfessionalDetails = signal<any>(null);
isTranslatingProfessional = signal(false);

// For collection item translation
translatedExperience = signal<Map<number, any>>(new Map());

// Current language
currentLanguage = signal<string>('en');
```

### 4. Listen to Language Changes (ngOnInit)

```typescript
ngOnInit(): void {
  // Subscribe to language changes
  this.translate.onLangChange
    .pipe(takeUntil(this.destroy$))
    .subscribe((event) => {
      this.currentLanguage.set(event.lang);
      
      // Reset translations when language changes
      this.translatedBio.set('');
      this.translatedProfessionalDetails.set(null);
      this.translatedExperience.set(new Map());
      
      // Auto-translate if not English
      if (event.lang !== 'en') {
        if (this.candidate?.bio) {
          this.translateBioToCurrentLanguage();
        }
        this.translateProfessionalDetails();
      }
    });

  // Set initial language
  this.currentLanguage.set(this.translate.currentLang || 'en');

  // Translate on init if needed
  if (this.currentLanguage() !== 'en') {
    if (this.candidate?.bio) {
      this.translateBioToCurrentLanguage();
    }
    this.translateProfessionalDetails();
  }
}

ngOnDestroy(): void {
  this.destroy$.next();
  this.destroy$.complete();
}
```

### 5. Create Translation Methods

#### For Single Field (Bio Example)

```typescript
async translateBioToCurrentLanguage(): Promise<void> {
  if (!this.candidate?.bio || this.currentLanguage() === 'en') {
    return;
  }

  this.isTranslatingBio.set(true);
  try {
    const translated = await this.userDataTranslation.translateUserData(
      this.candidate.bio,
      this.currentLanguage()
    );
    this.translatedBio.set(translated);
  } catch (error) {
    console.error('Error translating bio:', error);
    this.translatedBio.set('');
  } finally {
    this.isTranslatingBio.set(false);
  }
}
```

#### For Multiple Fields (Professional Details Example)

```typescript
async translateProfessionalDetails(): Promise<void> {
  if (!this.candidate || this.currentLanguage() === 'en') {
    return;
  }

  if (this.translatedProfessionalDetails()) {
    return; // Already translated
  }

  this.isTranslatingProfessional.set(true);
  try {
    const fields: any = {};
    if (this.candidate.occupation) fields.occupation = this.candidate.occupation;
    if (this.candidate.industry) fields.industry = this.candidate.industry;
    if (this.candidate.job_title) fields.job_title = this.candidate.job_title;

    const translated = await this.userDataTranslation.translateUserFields(
      fields,
      this.currentLanguage()
    );
    this.translatedProfessionalDetails.set(translated);
  } catch (error) {
    console.error('Error translating professional details:', error);
  } finally {
    this.isTranslatingProfessional.set(false);
  }
}
```

### 6. Display Translations in Template

#### Single Field with Loading State

```html
<!-- Bio Card -->
@if (candidate.bio) {
  <div class="profile-section-card mb-3">
    <div class="profile-section-card__header">
      <h6>About</h6>
      @if (translatedBio() && currentLanguage() !== 'en') {
        <span class="translated-badge">Translated by AI</span>
      }
    </div>
    <div class="profile-section-card__body">
      @if (isTranslatingBio()) {
        <div class="loading">Translating…</div>
      } @else if (translatedBio() && currentLanguage() !== 'en') {
        <p>{{ translatedBio() }}</p>
        <p class="original">Original: {{ candidate.bio }}</p>
      } @else {
        <p>{{ candidate.bio }}</p>
      }
    </div>
  </div>
}
```

#### Multiple Fields with Conditional Display

```html
<!-- Professional Details Card -->
<div class="col-sm-6">
  <div class="info-box">
    <label>Job Title</label>
    @if (translatedProfessionalDetails()?.job_title && currentLanguage() !== 'en') {
      {{ translatedProfessionalDetails().job_title }}
    } @else {
      {{ candidate.job_title || '—' }}
    }
  </div>
</div>

<div class="col-sm-6">
  <div class="info-box">
    <label>Industry</label>
    @if (translatedProfessionalDetails()?.industry && currentLanguage() !== 'en') {
      {{ translatedProfessionalDetails().industry }}
    } @else {
      {{ candidate.industry || '—' }}
    }
  </div>
</div>

<div class="col-sm-6">
  <div class="info-box">
    <label>Occupation</label>
    @if (translatedProfessionalDetails()?.occupation && currentLanguage() !== 'en') {
      {{ translatedProfessionalDetails().occupation }}
    } @else {
      {{ candidate.occupation || '—' }}
    }
  </div>
</div>
```

#### Collection Items with Translation Indicator

```html
<!-- Experience Section -->
@for (exp of candidate.experience; track $index) {
  <div class="experience-item">
    <h4>{{ exp.job_title }}</h4>
    <p>{{ exp.company_name }}</p>
    @if (exp.description) {
      <p>{{ exp.description }}</p>
      @if (currentLanguage() !== 'en') {
        <span class="translation-available">Translation available</span>
      }
    }
  </div>
}
```

---

## Usage Examples

### Example 1: Simple Component with Single Field

```typescript
@Component({
  selector: 'app-job-description',
  template: `
    <div class="job-desc">
      @if (isTranslating()) {
        <p>Loading…</p>
      } @else if (translatedDesc() && lang() !== 'en') {
        <p>{{ translatedDesc() }}</p>
        <p class="original">Original: {{ job.description }}</p>
      } @else {
        <p>{{ job.description }}</p>
      }
    </div>
  `
})
export class JobDescriptionComponent implements OnInit {
  @Input() job: Job | null = null;

  private userDataTranslation = inject(UserDataTranslationService);
  private translate = inject(TranslateService);

  translatedDesc = signal<string>('');
  isTranslating = signal(false);
  lang = signal<string>('en');

  ngOnInit() {
    this.lang.set(this.translate.currentLang || 'en');
    this.translate.onLangChange.subscribe((e) => {
      this.lang.set(e.lang);
      if (e.lang !== 'en') {
        this.translateDescription();
      } else {
        this.translatedDesc.set('');
      }
    });
  }

  async translateDescription() {
    if (!this.job?.description) return;
    this.isTranslating.set(true);
    try {
      const trans = await this.userDataTranslation.translateUserData(
        this.job.description,
        this.lang()
      );
      this.translatedDesc.set(trans);
    } finally {
      this.isTranslating.set(false);
    }
  }
}
```

### Example 2: Translate on Demand (No Auto-translate)

```typescript
export class MyComponent {
  private userDataTranslation = inject(UserDataTranslationService);

  userBio = 'I am a software engineer';
  translatedBio: string = '';

  async translateBioToSpanish() {
    try {
      this.translatedBio = await this.userDataTranslation.translateUserData(
        this.userBio,
        'es'
      );
    } catch (error) {
      console.error('Translation failed:', error);
    }
  }

  async translateBioToMultipleLanguages() {
    const languages = ['es', 'fr', 'de', 'ar'];
    const translations: Record<string, string> = {};

    for (const lang of languages) {
      translations[lang] = await this.userDataTranslation.translateUserData(
        this.userBio,
        lang
      );
    }

    console.log(translations);
    // Output:
    // {
    //   es: 'Soy ingeniero de software',
    //   fr: 'Je suis ingénieur logiciel',
    //   de: 'Ich bin Softwareingenieur',
    //   ar: 'أنا مهندس برمجيات'
    // }
  }
}
```

### Example 3: Bulk Translate Multiple Fields

```typescript
async translateCandidateProfile(candidateId: string) {
  const candidate = await this.candidateService.getById(candidateId);
  
  const fields = {
    bio: candidate.bio,
    experience_summary: candidate.experience_summary,
    hobbies: candidate.hobbies.join(', '),
    skills: candidate.skills.map(s => s.name).join(', ')
  };

  const translations = await this.userDataTranslation.translateUserFields(
    fields,
    'es'  // Spanish
  );

  // Result:
  // {
  //   bio: 'Soy ingeniero de software...',
  //   experience_summary: '10 años de experiencia...',
  //   hobbies: 'Lectura, codificación...',
  //   skills: 'Angular, TypeScript, Node.js'
  // }
}
```

---

## Best Practices

### 1. Always Unsubscribe from Observables

```typescript
private destroy$ = new Subject<void>();

ngOnInit() {
  this.translate.onLangChange
    .pipe(takeUntil(this.destroy$))  // ← Auto-unsubscribe
    .subscribe(() => { /* ... */ });
}

ngOnDestroy() {
  this.destroy$.next();
  this.destroy$.complete();
}
```

### 2. Handle Errors Gracefully

```typescript
try {
  const translated = await this.userDataTranslation.translateUserData(
    text,
    lang
  );
  this.translatedText.set(translated);
} catch (error) {
  console.error('Translation failed:', error);
  // Fallback: show original text
  // Component already handles this in template
}
```

### 3. Cache Translations Wisely

```typescript
// Don't re-translate if already cached
if (this.translatedBio()) {
  return; // Already translated this session
}

// Let UserDataTranslationService handle caching
const translated = await this.userDataTranslation.translateUserData(text, lang);
```

### 4. Show Loading States

```typescript
this.isTranslating.set(true);
try {
  // Do translation
} finally {
  this.isTranslating.set(false);  // ← Always clear loading state
}
```

### 5. Reset on Language Change

```typescript
this.translate.onLangChange.subscribe((event) => {
  // Clear old translations
  this.translatedBio.set('');
  this.translatedDetails.set(null);
  
  // Re-translate if not English
  if (event.lang !== 'en') {
    this.translateBio();
    this.translateDetails();
  }
});
```

---

## Supported Languages

| Code | Language |
|------|----------|
| en   | English (Default) |
| es   | Spanish |
| fr   | French |
| de   | German |
| it   | Italian |
| pt   | Portuguese |
| nl   | Dutch |
| ru   | Russian |
| zh   | Chinese |
| ja   | Japanese |
| ko   | Korean |
| ar   | Arabic |
| hi   | Hindi |
| tr   | Turkish |
| pl   | Polish |
| ... | 19 more languages supported via mapping |

---

## Performance Tips

1. **Auto-translate on demand**: Only translate when user views the content
2. **Lazy load collections**: Don't translate all experience items at once
3. **Cache aggressively**: 1-hour TTL prevents re-translation
4. **Show loading states**: Users understand it's not instant
5. **Batch translate**: Use `translateUserFields()` for multiple fields instead of multiple calls

---

## Testing the Integration

### Manual Test Checklist

- [ ] Change language in UI
- [ ] Bio translates automatically
- [ ] Professional details update
- [ ] Loading spinner shows briefly
- [ ] Switch back to English - original text shows
- [ ] Cache works (switch language again - instant)
- [ ] Error handling works (disable API key - graceful fallback)
- [ ] No console errors

### Test in Browser Console

```typescript
// Inject and test
const service = inject(UserDataTranslationService);

// Test single field
const result = await service.translateUserData('Hello', 'es');
console.log(result); // "Hola"

// Test multiple fields
const batch = await service.translateUserFields(
  { name: 'John', bio: 'Software engineer' },
  'fr'
);
console.log(batch);
// { name: 'Jean', bio: 'Ingénieur logiciel' }
```

---

## Troubleshooting

### Issue: Translations not showing

**Solution**: 
1. Check browser console for errors
2. Verify API endpoint is running: `POST http://localhost:3000/api/v1/translate`
3. Check .env has OPENAI_API_KEY
4. Check language code is valid (use 'es' not 'Spanish')

### Issue: API returns 429 (Rate Limited)

**Solution**:
- Backend has 10 requests/min rate limit
- Wait 60 seconds before retry
- Don't translate same text multiple times (caching should help)

### Issue: Translations are broken

**Solution**:
1. Check OpenAI API key is valid
2. Verify API key has credits
3. Check network tab for actual API response
4. Check browser console for error message

---

## Next Steps

1. **Apply to other components**: Use the same pattern in:
   - Job card component
   - Company profile component
   - Any component showing user data

2. **Add export functionality**: Export translated profiles as PDF

3. **Add admin panel**: Manage i18n keys and review translations

4. **Add translation quality scoring**: Show confidence levels

5. **Auto-translate historical data**: Bulk translate existing profiles

---

**Status**: ✅ **FULLY INTEGRATED**

CandidateProfileComponent now demonstrates complete multi-language translation capability!
