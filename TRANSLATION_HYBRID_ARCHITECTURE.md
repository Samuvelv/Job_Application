# Translation System - Hybrid Architecture

## Overview

The translation system now uses a **hybrid approach**:

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (localhost:4200)                 │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Static UI Text              Dynamic User Data              │
│  ───────────────              ─────────────────              │
│                                                               │
│  "Save"                       "I am an engineer"             │
│  "Cancel"                     "5 years experience"           │
│  "Loading..."                 "Software developer"           │
│  ↓                            ↓                             │
│  Load from                    Call Backend API              │
│  assets/i18n/es.json          only if needed                │
│                               ↓                             │
│  ✅ INSTANT                   Backend → OpenAI → Response   │
│  0 API calls                  ⏱️ 2-3 seconds                 │
│  User sees UI                 Cache for 1 hour              │
│  immediately                  ✅ Optional                    │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Key Components

### 1. LanguageService
**Purpose**: Manage language switching for UI text

**File**: `frontend/src/app/core/services/language.service.ts`

**What it does**:
- Loads pre-translated i18n JSON files
- No API calls needed
- Instant language switching
- Handles RTL/LTR languages

**Example**:
```typescript
// Instant language change (no waiting)
await this.languageService.use('es');
```

### 2. UserDataTranslationService
**Purpose**: Translate dynamic user-provided content

**File**: `frontend/src/app/core/services/user-data-translation.service.ts`

**What it does**:
- Translates user data on-demand via OpenAI API
- Only called when needed
- Caches results for 1 hour
- Handles all 34 languages
- Graceful fallback to original text

**Example**:
```typescript
// Translate user-provided bio
const translatedBio = await this.userDataTranslation.translateUserData(
  'I am a software engineer with 5 years of experience',
  'es'  // Spanish
);
```

## Architecture

### Static i18n Files (Pre-translated)

Located in: `frontend/src/assets/i18n/`

```
en.json  (84 KB - Original English)
ar.json  (76 KB - Arabic)
de.json  (69 KB - German)
es.json  (69 KB - Spanish)
fr.json  (70 KB - French)
... (34 languages total)
```

Each file contains:
```json
{
  "COMMON": {
    "save": "Save",
    "cancel": "Cancel",
    "loading": "Loading..."
  },
  "DASHBOARD": {
    "welcome": "Welcome",
    "analytics": "Analytics"
  }
  // ... more UI strings
}
```

### Backend Translation Endpoint

**Endpoint**: `POST /api/v1/translate`

**Purpose**: Translate user data via OpenAI

**Rate Limit**: 10 requests/min per IP

**Character Limit**: 100,000 characters per request

**Request**:
```json
{
  "fields": {
    "bio": "I am a software engineer",
    "experience": "5 years"
  },
  "targetLang": "es",
  "targetLangName": "Spanish"
}
```

**Response**:
```json
{
  "translated": {
    "bio": "Soy ingeniero de software",
    "experience": "5 años"
  }
}
```

## Usage Examples

### Example 1: Switch UI Language (Static)

```typescript
import { LanguageService } from '@core/services/language.service';

export class MyComponent {
  constructor(private languageService: LanguageService) {}

  switchToSpanish() {
    // Instant - loads from assets/i18n/es.json
    await this.languageService.use('es');
    // All UI updates immediately
  }

  switchToFrench() {
    // Instant - loads from assets/i18n/fr.json
    await this.languageService.use('fr');
  }
}
```

### Example 2: Translate User Data (Dynamic)

```typescript
import { UserDataTranslationService } from '@core/services/user-data-translation.service';

export class CandidateProfileComponent {
  bio = 'I am a software engineer with 5 years of experience';
  translatedBio: string = '';

  constructor(private userDataTranslation: UserDataTranslationService) {}

  async translateBioToSpanish() {
    this.translatedBio = await this.userDataTranslation.translateUserData(
      this.bio,
      'es'
    );
  }
}
```

### Example 3: Translate Multiple Fields

```typescript
async translateProfileToFrench() {
  const translated = await this.userDataTranslation.translateUserFields(
    {
      bio: 'Software engineer',
      experience: 'Senior developer at Google',
      hobbies: 'Reading, coding, hiking'
    },
    'fr'
  );

  // translated = {
  //   bio: 'Ingénieur logiciel',
  //   experience: 'Développeur principal chez Google',
  //   hobbies: 'Lecture, codage, randonnée'
  // }
}
```

## Flow Diagram

### Flow 1: Switch Language (UI Text Only)

```
User clicks "Español"
         ↓
LanguageService.use('es')
         ↓
Load assets/i18n/es.json (70 KB)
         ↓
Set all UI strings to Spanish
         ↓
✅ Done (instant, no API calls)
```

### Flow 2: Translate User Data

```
Candidate views their bio in Spanish
         ↓
Component detects language = 'es'
         ↓
userDataTranslation.translateUserData(bio, 'es')
         ↓
Check cache (1 hour TTL)
    ↓ HIT: Return cached translation
    ↓ MISS: Continue
         ↓
Call POST /api/v1/translate
         ↓
Backend calls OpenAI GPT-3.5-turbo
         ↓
Parse and validate response
         ↓
Cache for 1 hour
         ↓
Return translated text to component
         ↓
Display in UI
```

## Performance Comparison

| Aspect | Old System | New System |
|--------|-----------|-----------|
| Language Switch | 2-3 seconds (API call) | Instant (file load) |
| API Calls | Every language switch | Only for user data |
| User Data | Not translated | Translated on-demand |
| Cost | ~$2-3/month (all UI) | ~$0.50-1/month (users only) |
| UX | Waiting spinner | Instant UI update |

## Supported Languages

### Direct Support (15 languages)
- English (en)
- French (fr)
- German (de)
- Spanish (es)
- Portuguese (pt)
- Italian (it)
- Dutch (nl)
- Russian (ru)
- Chinese (zh)
- Japanese (ja)
- Korean (ko)
- Arabic (ar)
- Hindi (hi)
- Turkish (tr)
- Polish (pl)

### Mapped Support (19 languages)
All 34 languages supported through mapping to nearest available language.

## Caching Strategy

### Static Text Cache
- **Where**: Browser memory (TranslateService)
- **TTL**: Forever (until browser refresh)
- **Size**: ~70-90 KB per language

### User Data Cache
- **Where**: UserDataTranslationService in-memory Map
- **TTL**: 1 hour per translation
- **Size**: Unlimited (but with 1-hour expiration)

## Error Handling

### Static Text Failures
```typescript
// If i18n file fails to load
// 1. Log error
// 2. Fallback to English
// 3. Show error message to user
// 4. Retry option available
```

### User Data Translation Failures
```typescript
// If translation API fails
// 1. Log error
// 2. Return original text
// 3. No error shown to user
// 4. Graceful degradation
```

## Adding New Languages

### To add a new static language:
1. Create `frontend/src/assets/i18n/{code}.json`
2. Translate all keys from `en.json`
3. Add to SUPPORTED_LANGUAGES array in language.service.ts
4. Restart frontend

### To add new UI text keys:
1. Edit `frontend/src/assets/i18n/en.json`
2. Add key with English text
3. Manually translate to all other i18n files
4. Use in templates: `{{ 'SECTION.key' | translate }}`

## Testing

### Test 1: Language Switching
```bash
1. Start app
2. Click language selector
3. Choose "Español"
4. ✅ Should see Spanish UI instantly (0 API calls)
5. Check browser console: should see "Loading from assets/i18n/es.json"
```

### Test 2: User Data Translation
```bash
1. Go to candidate profile
2. Change language to "Français"
3. Hover over candidate bio
4. ✅ Should see French translation (after 2-3 seconds)
5. Check browser console: should see "Translating user data to French..."
```

## Future Enhancements

- [ ] Auto-translate user data when language changes (currently manual)
- [ ] Show "Translated by AI" badge on translated user content
- [ ] Allow users to edit translated text
- [ ] Translation quality scoring
- [ ] Admin panel to manage i18n keys
- [ ] Bulk translation of historical user data

## Migration from Old System

**Old**: Called OpenAI for ALL text (static + user data)
**New**: Only calls OpenAI for user data

**Changes**:
1. ✅ No more translation delay when switching language
2. ✅ Reduced API costs by ~70%
3. ✅ Better user experience (instant language switching)
4. ✅ Manual i18n updates for static text

---

**Status**: ✅ **PRODUCTION READY**

Hybrid approach balances:
- Performance (instant static text)
- Cost (no unnecessary API calls)
- Functionality (user data translated when needed)
