# Complete i18n Translation Implementation Guide

## Overview
This guide shows how to use the new i18n system to translate ALL text in the application, including:
- Static labels and buttons
- Form placeholders and validation messages
- Title attributes and aria-labels
- Dynamic content and user input

---

## 1. Using the Translate Pipe (Simple Labels)

### Syntax
```html
{{ 'NAMESPACE.key' | translate }}
```

### Examples

**Button Labels:**
```html
<button>{{ 'BUTTONS.save' | translate }}</button>
<button>{{ 'BUTTONS.cancel' | translate }}</button>
<button>{{ 'BUTTONS.delete' | translate }}</button>
```

**Form Labels:**
```html
<label>{{ 'FORMS.first_name' | translate }}</label>
<label>{{ 'FORMS.email' | translate }}</label>
<label>{{ 'FORMS.phone' | translate }}</label>
```

**Messages:**
```html
<p>{{ 'MESSAGES.loading' | translate }}</p>
<p>{{ 'MESSAGES.no_data' | translate }}</p>
<p class="error">{{ 'MESSAGES.operation_failed' | translate }}</p>
```

---

## 2. Using the Directive (HTML Attributes)

### For Placeholders

**Syntax:**
```html
<input [appTranslatePlaceholder]="'PLACEHOLDERS.search_name'" />
```

**Examples:**
```html
<!-- Search inputs -->
<input type="text" [appTranslatePlaceholder]="'PLACEHOLDERS.search_name'" />
<input type="text" [appTranslatePlaceholder]="'PLACEHOLDERS.search_job_title'" />

<!-- Form inputs -->
<input type="text" [appTranslatePlaceholder]="'PLACEHOLDERS.enter_reason'" />
<textarea [appTranslatePlaceholder]="'PLACEHOLDERS.enter_message'"></textarea>

<!-- Select dropdowns -->
<select [appTranslatePlaceholder]="'PLACEHOLDERS.select_country'">
  <option value="">Select a country…</option>
</select>
```

### For Title Attributes (Tooltips)

**Syntax:**
```html
<button [appTranslateTitle]="'BUTTONS.save'" />
```

**Examples:**
```html
<button [appTranslateTitle]="'BUTTONS.delete'" class="btn-icon">
  <i class="bi bi-trash"></i>
</button>

<a href="#" [appTranslateTitle]="'BUTTONS.download'">
  <i class="bi bi-download"></i>
</a>

<span class="info-icon" [appTranslateTitle]="'FORMS.optional'">
  <i class="bi bi-info-circle"></i>
</span>
```

### For Accessibility (aria-label)

**Syntax:**
```html
<button [appTranslateAriaLabel]="'BUTTONS.close'" />
```

**Examples:**
```html
<!-- Screen reader labels -->
<button [appTranslateAriaLabel]="'BUTTONS.close'" aria-label="Close">
  <i class="bi bi-x"></i>
</button>

<input type="text" [appTranslateAriaLabel]="'FORMS.search'" />

<button [appTranslateAriaLabel]="'BUTTONS.upload'" class="file-upload">
  <i class="bi bi-upload"></i>
</button>
```

---

## 3. Using the I18nAttributesService (Dynamic Content)

### Inject the Service
```typescript
import { I18nAttributesService } from '../../../core/services/i18n-attributes.service';

export class MyComponent {
  constructor(private i18n: I18nAttributesService) {}
}
```

### Subscribe to Translations

**Single Key:**
```typescript
this.i18n.translate('FORMS.first_name').subscribe(translated => {
  console.log(translated); // "First Name"
});
```

**Multiple Keys:**
```typescript
this.i18n.translateMultiple([
  'BUTTONS.save',
  'BUTTONS.cancel',
  'FORMS.email'
]).subscribe(translations => {
  console.log(translations);
  // {
  //   'BUTTONS.save': 'Save',
  //   'BUTTONS.cancel': 'Cancel',
  //   'FORMS.email': 'Email Address'
  // }
});
```

**With Form Label:**
```typescript
this.i18n.getFormLabel('FORMS.phone').subscribe(label => {
  this.phoneLabel = label;
});
```

**With Placeholder:**
```typescript
this.i18n.getPlaceholder('PLACEHOLDERS.search_name').subscribe(placeholder => {
  this.searchPlaceholder = placeholder;
});
```

**With Error Message:**
```typescript
this.i18n.getErrorMessage('FORMS.required_field').subscribe(message => {
  this.errorMessage = message;
});
```

**Instantly (without subscribe):**
```typescript
const saveButtonText = this.i18n.instant('BUTTONS.save');
console.log(saveButtonText); // "Save" (current language)
```

---

## 4. Real-World Examples

### Complete Form Component

```html
<div class="form-group">
  <label>{{ 'FORMS.first_name' | translate }} *</label>
  <input 
    type="text"
    [appTranslatePlaceholder]="'PLACEHOLDERS.enter_reason'"
    [appTranslateTitle]="'FORMS.first_name'"
    [(ngModel)]="formData.firstName"
    required />
  @if (errors.firstName) {
    <small class="error">{{ 'FORMS.required_field' | translate }}</small>
  }
</div>

<div class="form-group">
  <label>{{ 'FORMS.email' | translate }} *</label>
  <input 
    type="email"
    [appTranslatePlaceholder]="'PLACEHOLDERS.enter_email'"
    [(ngModel)]="formData.email"
    required />
  @if (errors.email) {
    <small class="error">{{ 'FORMS.invalid_email' | translate }}</small>
  }
</div>

<div class="form-group">
  <label>{{ 'FORMS.country' | translate }}</label>
  <select [appTranslatePlaceholder]="'PLACEHOLDERS.select_country'">
    <option value="">{{ 'PLACEHOLDERS.select_country' | translate }}</option>
    <option *ngFor="let country of countries" [value]="country.code">
      {{ country.name }}
    </option>
  </select>
</div>

<button [appTranslateTitle]="'BUTTONS.save'" (click)="save()">
  {{ 'BUTTONS.save' | translate }}
</button>
<button [appTranslateTitle]="'BUTTONS.cancel'" (click)="cancel()">
  {{ 'BUTTONS.cancel' | translate }}
</button>
```

### Upload Component

```html
<div class="upload-area">
  <input
    type="file"
    [appTranslatePlaceholder]="'FORMS.upload_resume'"
    [appTranslateAriaLabel]="'BUTTONS.upload'"
    (change)="onFileSelected($event)" />
  <button [appTranslateTitle]="'BUTTONS.upload'">
    <i class="bi bi-upload"></i>
    {{ 'BUTTONS.upload' | translate }}
  </button>
</div>

@if (uploadError) {
  <div class="alert alert-danger">
    {{ uploadError | translate }}
  </div>
}

@if (uploadProgress > 0 && uploadProgress < 100) {
  <div class="progress">
    <div class="progress-bar" [style.width.%]="uploadProgress">
      {{ uploadProgress }}%
    </div>
  </div>
}
```

### Search Component

```html
<div class="search-container">
  <input
    type="text"
    [appTranslatePlaceholder]="'PLACEHOLDERS.search_name'"
    [appTranslateAriaLabel]="'BUTTONS.search'"
    [(ngModel)]="searchQuery"
    (change)="onSearch()" />
  <button 
    (click)="onSearch()"
    [appTranslateTitle]="'BUTTONS.search'"
    [appTranslateAriaLabel]="'BUTTONS.search'">
    <i class="bi bi-search"></i>
  </button>
</div>

@if (loading) {
  <p class="text-center">{{ 'MESSAGES.loading' | translate }}</p>
}

@if (!loading && results.length === 0) {
  <div class="empty-state">
    <p>{{ 'MESSAGES.no_results' | translate }}</p>
  </div>
}

<table class="results-table">
  <thead>
    <tr>
      <th>{{ 'FORMS.first_name' | translate }}</th>
      <th>{{ 'FORMS.email' | translate }}</th>
      <th>{{ 'BUTTONS.actions' | translate }}</th>
    </tr>
  </thead>
  <tbody>
    <tr *ngFor="let item of results">
      <td>{{ item.firstName }}</td>
      <td>{{ item.email }}</td>
      <td>
        <button [appTranslateTitle]="'BUTTONS.edit'">
          {{ 'BUTTONS.edit' | translate }}
        </button>
        <button [appTranslateTitle]="'BUTTONS.delete'">
          {{ 'BUTTONS.delete' | translate }}
        </button>
      </td>
    </tr>
  </tbody>
</table>
```

### Validation/Error Messages in Component

```typescript
import { Component } from '@angular/core';
import { I18nAttributesService } from '../../../core/services/i18n-attributes.service';

@Component({
  selector: 'app-registration',
  template: `
    <form>
      <div class="form-group">
        <label>{{ 'FORMS.email' | translate }}</label>
        <input 
          type="email"
          [appTranslatePlaceholder]="'PLACEHOLDERS.enter_email'"
          [(ngModel)]="email"
          (blur)="validateEmail()" />
        @if (emailError) {
          <small class="error">{{ emailError }}</small>
        }
      </div>

      <button (click)="register()">
        {{ 'BUTTONS.submit' | translate }}
      </button>
    </form>
  `
})
export class RegistrationComponent {
  email = '';
  emailError = '';

  constructor(private i18n: I18nAttributesService) {}

  validateEmail(): void {
    if (!this.email.includes('@')) {
      // Translate error message
      this.i18n.translate('FORMS.invalid_email').subscribe(msg => {
        this.emailError = msg;
      });
    } else {
      this.emailError = '';
    }
  }

  register(): void {
    this.i18n.translate('MESSAGES.operation_successful').subscribe(msg => {
      console.log(msg);
      alert(msg);
    });
  }
}
```

---

## 5. Namespaces Reference

### Available i18n Namespaces

| Namespace | Description | Example Keys |
|-----------|-------------|--------------|
| COMMON | General UI | back, next, cancel, search |
| FORMS | Form labels & validation | first_name, email, required_field |
| BUTTONS | Button labels | save, delete, upload, apply |
| PLACEHOLDERS | Input placeholders | search_name, enter_reason, select_country |
| MESSAGES | Notifications & feedback | loading, no_data, success, error |
| EMPTY_STATES | Empty data messages | no_photo, no_resume, no_certificates |
| ERRORS | Error messages | not_found, server_error, network_error |
| ADMIN | Admin section | add_candidate, new_recruiter, manage_candidates |
| CANDIDATE_PROFILE | Profile labels | bio, experience, education |
| NAV | Navigation items | dashboard, candidates, recruiters |

---

## 6. Best Practices

✅ **DO:**
- Use `| translate` pipe for visible UI text
- Use `[appTranslatePlaceholder]` for input placeholders
- Use `[appTranslateTitle]` for tooltips
- Use `[appTranslateAriaLabel]` for accessibility
- Organize related keys into namespaces
- Use meaningful key names (lowercase with underscores)
- Add new keys to en.json before using them

❌ **DON'T:**
- Hardcode strings directly in templates
- Forget to add keys to i18n files
- Use keys that don't exist
- Mix translated and non-translated content
- Change keys after deployment (breaks translations)

---

## 7. Adding New Translations

### Step 1: Add Key to en.json
```json
"MY_NEW_NAMESPACE": {
  "my_new_key": "My Translated Text"
}
```

### Step 2: Use in Template
```html
{{ 'MY_NEW_NAMESPACE.my_new_key' | translate }}
```

### Step 3: The key automatically translates to other languages

---

## Summary

| Use Case | Solution | Example |
|----------|----------|---------|
| Display translated text | Translate pipe | `{{ 'BUTTONS.save' \| translate }}` |
| Input placeholder | Directive | `[appTranslatePlaceholder]="'PLACEHOLDERS.search'"` |
| Tooltip/title | Directive | `[appTranslateTitle]="'BUTTONS.save'"` |
| Screen reader label | Directive | `[appTranslateAriaLabel]="'FORMS.email'"` |
| Dynamic translation | Service | `this.i18n.translate('KEY').subscribe(...)` |
| Instant translation | Service method | `this.i18n.instant('KEY')` |

---

**All text in your application is now fully translatable!** 🌍
