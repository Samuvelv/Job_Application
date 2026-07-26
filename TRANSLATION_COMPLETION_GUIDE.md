# Translation Completion Guide

## Project Status

**Overall Progress:** 27/55 components fully translated (~49%)

### Components Status by Category

#### ✅ COMPLETED (Fully Translated - 27 components)
- Admin Dashboard
- Login Page
- Landing Page
- All major shared components with TranslateModule
- [+23 other components with translate pipes]

#### 🟡 IN PROGRESS (Partially Translated - 3 components)
- `recruiter-list.component.ts` - Page header and table headers translated
- `volunteer-list.component.ts` - Page header and search translated
- `candidate-list.component.ts` - [Pending detailed translation]

#### ❌ NOT STARTED (26-30 components remain)
- Admin feature pages (edit-requests, interest-requests, contact-submissions, audit-logs, master-management, etc.)
- Recruiter feature pages (candidates search, shortlist, interest-requests, profile)
- Candidate feature pages (profile, edit-request, requests)
- Volunteer feature pages (browse, create, profile)

---

## Quick Start: Next Steps

### Step 1: Verify Current State
```bash
cd frontend
npm run build
# Should see: ✅ Application bundle generation complete
```

### Step 2: Choose a Component to Translate

**Recommended Order (Highest Impact First):**

1. `admin/recruiter-list/recruiter-list.component.ts` (1662 lines - COMPLEX, but partially done)
2. `admin/candidate-list/candidate-list.component.ts` (Similar structure)
3. `admin/edit-requests/edit-requests.component.ts` (High visibility)
4. `admin/volunteers/volunteer-list.component.ts` (Already started)
5. `recruiter/candidates/candidates.component.ts` (Recruiter dashboard)

### Step 3: Translation Workflow for Each Component

For each component with hardcoded English strings:

#### 3a. Find Hardcoded Strings
```bash
# Open the .component.ts file
# Look for plain text in template (not wrapped in {{ ... | translate }})
# Examples:
# - Titles: title="Recruiters"
# - Labels: <label>Company Name</label>
# - Buttons: <button>Add Recruiter</button>
# - Placeholders: placeholder="Search name, company, email…"
# - Status: {{ rec.is_active ? 'Active' : 'Inactive' }}
```

#### 3b. Replace with i18n Keys

**Pattern 1 - Simple Labels (Most Common)**
```html
<!-- Before -->
<label>Company Name</label>

<!-- After -->
<label>{{ 'FORMS.company_name' | translate }}</label>
```

**Pattern 2 - Titles and Headings**
```html
<!-- Before -->
<h5 class="modal-title">Edit Recruiter</h5>

<!-- After -->
<h5 class="modal-title">{{ 'RECRUITER_LIST.edit_title' | translate }}</h5>
```

**Pattern 3 - Button Text**
```html
<!-- Before -->
<button>Add Recruiter</button>

<!-- After -->
<button>{{ 'RECRUITER_CREATE.title' | translate }}</button>
```

**Pattern 4 - Ternary/Conditional Text**
```html
<!-- Before -->
{{ rec.is_active ? 'Active' : 'Inactive' }}

<!-- After -->
{{ rec.is_active ? ('COMMON.active' | translate) : ('COMMON.inactive' | translate) }}
```

**Pattern 5 - Placeholders**
```html
<!-- Before -->
placeholder="Search name, company, email…"

<!-- After -->
[placeholder]="'RECRUITER_LIST.search_placeholder' | translate"
```

**Pattern 6 - Page Headers**
```html
<!-- Before -->
<app-page-header title="Recruiters" subtitle="...">

<!-- After -->
<app-page-header [title]="'RECRUITER_LIST.title' | translate" [subtitle]="...">
```

**Pattern 7 - Array/Map Options**
```html
<!-- Before -->
<option value="active">Active</option>
<option value="inactive">Inactive</option>

<!-- After -->
<option value="active">{{ 'COMMON.active' | translate }}</option>
<option value="inactive">{{ 'COMMON.inactive' | translate }}</option>
```

#### 3c. Add Missing i18n Keys

Edit `frontend/src/assets/i18n/en.json`:

1. Find the appropriate section (COMMON, FORMS, OPTIONS, ADMIN, RECRUITER_LIST, etc.)
2. Add new keys following the pattern:
```json
{
  "SECTION_NAME": {
    "existing_key": "Existing Value",
    "new_key": "New Value"
  }
}
```

**Important:** Make sure to add a comma after each key-value pair (except the last one in the object).

#### 3d. Test Your Changes
```bash
npm run build
```

Should see: ✅ No build errors

---

## Available i18n Keys Reference

### Commonly Used COMMON Keys
```json
{
  "save": "Save",
  "cancel": "Cancel",
  "delete": "Delete",
  "edit": "Edit",
  "view": "View",
  "search": "Search",
  "filters": "Filters",
  "clear": "Clear",
  "status": "Status",
  "actions": "Actions",
  "name": "Name",
  "email": "Email",
  "active": "Active",
  "inactive": "Inactive",
  "pending": "Pending",
  "approved": "Approved",
  "rejected": "Rejected"
}
```

### FORMS Keys for Field Labels
```json
{
  "first_name": "First Name",
  "last_name": "Last Name",
  "email": "Email Address",
  "phone": "Phone Number",
  "company_name": "Company Name",
  "job_title": "Job Title",
  "industry": "Industry",
  "years_experience": "Years of Experience"
}
```

### OPTIONS Keys for Dropdown Values
```json
{
  "profile_status_active": "Active",
  "profile_status_inactive": "Inactive",
  "profile_status_placed": "Placed",
  "emp_employed": "Currently Employed",
  "emp_unemployed": "Currently Unemployed"
}
```

### Page-Specific Sections
- `ADMIN` - Admin dashboard and management pages
- `RECRUITER_LIST` - Recruiter list view
- `RECRUITER_CREATE` - Recruiter creation form
- `RECRUITER_DASHBOARD` - Recruiter portal dashboard
- `RECRUITER_CANDIDATES` - Recruiter candidate search
- `CANDIDATE_LIST` - Candidate list (admin view)
- `CANDIDATE_DASHBOARD` - Candidate portal
- `EDIT_REQUESTS` - Edit request management
- `INTEREST_REQUESTS` - Interest request forms
- `VOLUNTEERS` - Volunteer management
- `AUDIT_LOGS` - Audit log viewing
- `MASTER` - Master data management

---

## Common Hardcoded Patterns to Find & Replace

### Quick Find Patterns (Use VS Code Find)

Search for these patterns to find remaining hardcoded strings:

1. `placeholder="` - Form placeholders
2. `title="` - Page titles
3. `subtitle="` - Page subtitles
4. `<label>` - Form labels (followed by plain text)
5. `>Add ` - Add buttons
6. `>Edit ` - Edit buttons
7. `>Delete ` - Delete buttons
8. `? '` - Ternary operators with plain text
9. `<h5>` - Headings with plain text
10. `<span class="badge` - Status badges with plain text

---

## File-by-File Translation Checklist

### High Priority (Maximum Impact)
- [ ] `admin/candidate-list/candidate-list.component.ts`
- [ ] `admin/edit-requests/edit-requests.component.ts`
- [ ] `admin/interest-requests/interest-requests.component.ts`
- [ ] `recruiter/candidates/candidates.component.ts`
- [ ] `recruiter/shortlist/shortlist.component.ts`

### Medium Priority
- [ ] `admin/contact-submissions/contact-submissions-page.component.ts`
- [ ] `admin/audit-logs/audit-logs.component.ts`
- [ ] `admin/master/master-management.component.ts`
- [ ] `recruiter/dashboard/recruiter-dashboard.component.ts`
- [ ] `recruiter/interest-requests/recruiter-interest-requests.component.ts`

### Lower Priority
- [ ] `candidate/profile/my-profile.component.ts`
- [ ] `candidate/edit-request/edit-request.component.ts`
- [ ] `volunteer/browse/volunteer-browse.component.ts`
- [ ] `volunteer/create/volunteer-create.component.ts`
- [ ] `shared/components/sidebar/sidebar.component.ts`

---

## Verification: Language Switching Test

After completing translations:

1. Start the application
2. Look for language selector (usually in topbar)
3. Switch between English and other available language
4. Verify that translated text appears instead of hardcoded English
5. Check browser console for i18n errors (should be none)

---

## Troubleshooting

### Issue: Build fails with "ERROR"
**Solution:** Check that:
- All pipes have correct syntax: `{{ 'KEY' | translate }}`
- All i18n keys exist in `en.json`
- No typos in key names
- JSON is valid (run through JSONLint if needed)

### Issue: Translate pipe shows [object Object]
**Solution:** You're trying to translate a non-string value. Use:
```html
<!-- Before (WRONG) -->
{{ (count | translate) }}

<!-- After (CORRECT) -->
{{ count }} {{ 'COMMON.items' | translate }}
```

### Issue: Key appears as "KEY.NAME" in UI
**Solution:** The i18n key doesn't exist in `en.json`. Add it to the appropriate section.

### Issue: "Cannot find module @ngx-translate"
**Solution:** Already imported in components, but ensure:
- `TranslateModule` is in component's `imports` array
- Package is installed: `npm install @ngx-translate/core @ngx-translate/http-loader`

---

## Performance Tips

### Batch Translation
Don't translate one line at a time. For each component:
1. Identify ALL hardcoded strings first
2. Group similar strings together
3. Replace all at once using Find & Replace
4. Test build once at the end

### Find & Replace Strategy
```bash
# In VS Code:
# 1. Ctrl+H to open Find & Replace
# 2. Find: <h5 class="modal-title">Edit
# 3. Replace: <h5 class="modal-title">{{ 'KEY_NAME' | translate }}
```

### Parallel Work
Multiple developers can work on different components simultaneously.

---

## Completion Timeline Estimate

| Task | Estimated Time | Difficulty |
|------|----------------|-----------|
| 5 High Priority Components | 3-4 hours | Medium |
| 5 Medium Priority Components | 3-4 hours | Medium |
| 5-10 Lower Priority Components | 2-3 hours | Easy-Medium |
| Testing & QA | 1-2 hours | Easy |
| **TOTAL** | **10-13 hours** | - |

---

## Final Success Criteria

When translation is complete, verify:

- ✅ All 55 components have TranslateModule imported
- ✅ All visible UI text uses `| translate` pipe or is dynamic data
- ✅ No hardcoded English strings in component templates
- ✅ Build passes: `npm run build` with 0 errors
- ✅ Language selector works across all pages
- ✅ All i18n keys exist in `en.json`
- ✅ No missing pipe errors in browser console
- ✅ User testing confirms language switching works

---

## Support & References

### Key Files
- Translation file: `frontend/src/assets/i18n/en.json`
- Translation loader: `frontend/src/app/core/services/translation.service.ts`
- Example translated component: `frontend/src/app/features/admin/dashboard/admin-dashboard.component.ts`

### Angular i18n Documentation
- [@ngx-translate/core](https://github.com/ngx-translate/core)
- [Angular i18n Guide](https://angular.io/guide/i18n-overview)

### Git Commands to Track Progress
```bash
# See what you've changed
git status

# See specific changes
git diff frontend/src/assets/i18n/en.json

# Commit your work
git add frontend/
git commit -m "Translate [component-name] component to support i18n"
```

---

**Last Updated:** July 26, 2026  
**Total Components:** 55  
**Translated:** 27 (49%)  
**Remaining:** 26-30 (51%)
