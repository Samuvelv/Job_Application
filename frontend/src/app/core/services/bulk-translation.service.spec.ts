import { TestBed } from '@angular/core/testing';
import { BulkTranslationService } from './bulk-translation.service';
import { UserDataTranslationService } from './user-data-translation.service';
import { TranslateService } from '@ngx-translate/core';

describe('BulkTranslationService', () => {
  let service: BulkTranslationService;
  let userDataTranslationMock: jasmine.SpyObj<UserDataTranslationService>;
  let translateServiceMock: jasmine.SpyObj<TranslateService>;

  beforeEach(() => {
    // Create mock for UserDataTranslationService
    userDataTranslationMock = jasmine.createSpyObj('UserDataTranslationService', [
      'translateUserFields',
      'clearCache',
      'clearCacheForLanguage'
    ]);

    // Create mock for TranslateService
    translateServiceMock = jasmine.createSpyObj('TranslateService', ['use']);

    TestBed.configureTestingModule({
      providers: [
        BulkTranslationService,
        { provide: UserDataTranslationService, useValue: userDataTranslationMock },
        { provide: TranslateService, useValue: translateServiceMock }
      ]
    });

    service = TestBed.inject(BulkTranslationService);
  });

  describe('translateSection', () => {
    it('should return original fields for English language', async () => {
      const fields = {
        job_title: 'Angular Developer',
        industry: 'Technology'
      };

      const result = await service.translateSection(fields, 'en');

      expect(result).toEqual(fields);
      expect(userDataTranslationMock.translateUserFields).not.toHaveBeenCalled();
    });

    it('should filter out null and undefined values', async () => {
      const fields = {
        job_title: 'Angular Developer',
        industry: null,
        years_exp: undefined,
        bio: 'I am a developer'
      };

      userDataTranslationMock.translateUserFields.and.returnValue(
        Promise.resolve({
          job_title: 'Développeur Angular',
          bio: 'Je suis développeur'
        })
      );

      const result = await service.translateSection(fields, 'fr');

      expect(result.job_title).toBe('Développeur Angular');
      expect(result.bio).toBe('Je suis développeur');
      expect(result.industry).toBeUndefined();
      expect(result.years_exp).toBeUndefined();
    });

    it('should make one API call for small sections', async () => {
      const fields = {
        job_title: 'Angular Developer',
        industry: 'Technology',
        occupation: 'Software Engineer'
      };

      userDataTranslationMock.translateUserFields.and.returnValue(
        Promise.resolve({
          job_title: 'Desarrollador Angular',
          industry: 'Tecnología',
          occupation: 'Ingeniero de Software'
        })
      );

      await service.translateSection(fields, 'es');

      expect(userDataTranslationMock.translateUserFields).toHaveBeenCalledTimes(1);
    });

    it('should use cache for repeated translations', async () => {
      const fields = {
        job_title: 'Angular Developer',
        industry: 'Technology'
      };

      userDataTranslationMock.translateUserFields.and.returnValue(
        Promise.resolve({
          job_title: 'Développeur Angular',
          industry: 'Technologie'
        })
      );

      // First call
      await service.translateSection(fields, 'fr');
      expect(userDataTranslationMock.translateUserFields).toHaveBeenCalledTimes(1);

      // Second call (should use cache)
      await service.translateSection(fields, 'fr');
      expect(userDataTranslationMock.translateUserFields).toHaveBeenCalledTimes(1);
    });

    it('should return original fields on API error', async () => {
      const fields = {
        job_title: 'Angular Developer',
        industry: 'Technology'
      };

      userDataTranslationMock.translateUserFields.and.returnValue(
        Promise.reject(new Error('API Error'))
      );

      const result = await service.translateSection(fields, 'fr');

      expect(result).toEqual(fields);
    });
  });

  describe('Text Chunking Logic', () => {
    it('should NOT chunk small sections (< 5000 chars)', async () => {
      // Create fields totaling ~500 chars
      const fields: Record<string, string> = {};
      for (let i = 0; i < 5; i++) {
        fields[`skill_${i}`] = 'Senior Angular Developer with 8+ years experience';
      }

      userDataTranslationMock.translateUserFields.and.returnValue(
        Promise.resolve(fields) // Return translated
      );

      await service.translateSection(fields, 'fr');

      // Should make only 1 API call
      expect(userDataTranslationMock.translateUserFields).toHaveBeenCalledTimes(1);
    });

    it('should chunk large sections into multiple API calls (> 5000 chars)', async () => {
      // Create large fields totaling ~12,000 chars
      const fields: Record<string, string> = {};
      const longText = 'A'.repeat(1200); // 1200 chars per field

      for (let i = 0; i < 10; i++) {
        fields[`exp_${i}_description`] = longText;
      }

      // Mock to return partial translations (simulating chunk processing)
      userDataTranslationMock.translateUserFields.and.returnValue(
        Promise.resolve(fields)
      );

      await service.translateSection(fields, 'fr');

      // Should make 3-4 API calls due to chunking (12000 / 5000 ≈ 2-3 calls)
      // But exact number depends on field size calculation
      expect(userDataTranslationMock.translateUserFields.calls.count()).toBeGreaterThan(1);
    });

    it('should handle experience array with many items', async () => {
      // Simulate 20 experiences with 4 fields each
      const experiences: any[] = [];
      for (let i = 0; i < 20; i++) {
        experiences.push({
          id: `exp_${i}`,
          job_title: `Senior Role ${i}`,
          company_name: `Company ${i}`,
          description: 'Managed large-scale projects, led teams, implemented architecture patterns'.repeat(2),
          reason_for_leaving: 'Career growth opportunity'
        });
      }

      // Mock translation
      const expectedResult: Record<string, Record<string, string>> = {};
      for (let i = 0; i < 20; i++) {
        expectedResult[i] = {
          job_title: `Rôle Senior ${i}`,
          company_name: `Entreprise ${i}`,
          description: 'Géré de grands projets...'.repeat(2),
          reason_for_leaving: 'Opportunité de développement professionnel'
        };
      }

      userDataTranslationMock.translateUserFields.and.returnValue(
        Promise.resolve(expectedResult)
      );

      const result = await service.translateExperienceBulk(experiences, 'fr');

      // Should make 2-3 API calls for 20 experiences (not 80 individual calls)
      const apiCalls = userDataTranslationMock.translateUserFields.calls.count();
      expect(apiCalls).toBeLessThan(5); // Should be 2-3, max 4
      expect(apiCalls).toBeGreaterThan(1); // Definitely more than 1 due to size
    });
  });

  describe('Translation Completeness Verification', () => {
    it('should verify all fields are translated', async () => {
      const fields = {
        job_title: 'Angular Developer',
        industry: 'Technology',
        occupation: 'Software Engineer'
      };

      userDataTranslationMock.translateUserFields.and.returnValue(
        Promise.resolve({
          job_title: 'Desarrollador Angular',
          industry: 'Tecnología',
          occupation: 'Ingeniero de Software'
        })
      );

      const result = await service.translateSection(fields, 'es');

      // All fields should be present
      expect(Object.keys(result).length).toEqual(Object.keys(fields).length);
      expect(result.job_title).toBeTruthy();
      expect(result.industry).toBeTruthy();
      expect(result.occupation).toBeTruthy();
    });

    it('should detect missing translations', async () => {
      const fields = {
        job_title: 'Angular Developer',
        industry: 'Technology',
        occupation: 'Software Engineer'
      };

      // Simulate incomplete translation (missing one field)
      userDataTranslationMock.translateUserFields.and.returnValue(
        Promise.resolve({
          job_title: 'Desarrollador Angular',
          industry: '', // Empty translation
          occupation: 'Ingeniero de Software'
        })
      );

      spyOn(console, 'warn');

      const result = await service.translateSection(fields, 'es');

      // Should log warning about missing field
      expect(console.warn).toHaveBeenCalled();
    });

    it('should handle education array bulk translation', async () => {
      const educations = [
        {
          id: 'edu_1',
          degree: 'Bachelor of Science',
          field_of_study: 'Computer Science',
          institution: 'MIT',
          description: 'Specialized in software architecture and distributed systems'
        },
        {
          id: 'edu_2',
          degree: 'Master of Science',
          field_of_study: 'Artificial Intelligence',
          institution: 'Stanford University',
          description: 'Focus on machine learning and neural networks'
        }
      ];

      userDataTranslationMock.translateUserFields.and.returnValue(
        Promise.resolve({
          edu_0_degree: 'Licence',
          edu_0_field: 'Informatique',
          edu_0_institution: 'MIT',
          edu_0_description: 'Spécialisé en architecture logicielle...',
          edu_1_degree: 'Master',
          edu_1_field: 'Intelligence Artificielle',
          edu_1_institution: 'Université Stanford',
          edu_1_description: 'Focus sur l\'apprentissage automatique...'
        })
      );

      const result = await service.translateEducationBulk(educations, 'fr');

      expect(Object.keys(result).length).toEqual(2);
      expect(result[0].degree).toBe('Licence');
      expect(result[1].field).toBe('Intelligence Artificielle');
    });

    it('should handle skills array bulk translation', async () => {
      const skills = [
        { skill_name: 'Angular' },
        { skill_name: 'TypeScript' },
        { skill_name: 'React' },
        { skill_name: 'Node.js' },
        { skill_name: 'Docker' }
      ];

      userDataTranslationMock.translateUserFields.and.returnValue(
        Promise.resolve({
          skill_0: 'Angular',
          skill_1: 'TypeScript',
          skill_2: 'React',
          skill_3: 'Node.js',
          skill_4: 'Docker'
        })
      );

      const result = await service.translateSkillsBulk(skills, 'fr');

      expect(Object.keys(result).length).toEqual(5);
      expect(userDataTranslationMock.translateUserFields).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling and Fallback', () => {
    it('should return empty object for empty skills array', async () => {
      const result = await service.translateSkillsBulk([], 'fr');
      expect(result).toEqual({});
      expect(userDataTranslationMock.translateUserFields).not.toHaveBeenCalled();
    });

    it('should return empty object for empty education array', async () => {
      const result = await service.translateEducationBulk([], 'fr');
      expect(result).toEqual({});
      expect(userDataTranslationMock.translateUserFields).not.toHaveBeenCalled();
    });

    it('should return empty object for empty certificates array', async () => {
      const result = await service.translateCertificatesBulk([], 'fr');
      expect(result).toEqual({});
      expect(userDataTranslationMock.translateUserFields).not.toHaveBeenCalled();
    });

    it('should gracefully handle null values in arrays', async () => {
      const skills = [
        { skill_name: 'Angular' },
        { skill_name: null },
        { skill_name: undefined },
        { skill_name: 'React' }
      ];

      userDataTranslationMock.translateUserFields.and.returnValue(
        Promise.resolve({
          skill_0: 'Angular',
          skill_3: 'React'
        })
      );

      const result = await service.translateSkillsBulk(skills, 'fr');

      expect(Object.keys(result).length).toEqual(2);
      expect(userDataTranslationMock.translateUserFields).toHaveBeenCalledTimes(1);
    });

    it('should handle partial chunk failure with fallback', async () => {
      const fields: Record<string, string> = {};
      const longText = 'A'.repeat(1200);

      for (let i = 0; i < 10; i++) {
        fields[`exp_${i}_description`] = longText;
      }

      // Simulate first chunk succeeds, second fails
      userDataTranslationMock.translateUserFields.and.returnValues(
        Promise.resolve({ exp_0_description: 'Chunk 1 translated' }),
        Promise.reject(new Error('Chunk 2 failed'))
      );

      const result = await service.translateSection(fields, 'fr');

      // Should have at least partial results
      expect(Object.keys(result).length).toBeGreaterThan(0);
    });
  });

  describe('Cache Management', () => {
    it('should clear cache', async () => {
      const fields = {
        job_title: 'Angular Developer',
        industry: 'Technology'
      };

      userDataTranslationMock.translateUserFields.and.returnValue(
        Promise.resolve({
          job_title: 'Développeur Angular',
          industry: 'Technologie'
        })
      );

      // First translation
      await service.translateSection(fields, 'fr');

      // Clear cache
      service.clearCache();

      // Second translation (should call API again)
      await service.translateSection(fields, 'fr');

      expect(userDataTranslationMock.translateUserFields).toHaveBeenCalledTimes(2);
    });

    it('should clear language-specific cache', async () => {
      const fields = {
        job_title: 'Angular Developer',
        industry: 'Technology'
      };

      userDataTranslationMock.translateUserFields.and.returnValue(
        Promise.resolve({
          job_title: 'Translated',
          industry: 'Translated'
        })
      );

      // Translate to French
      await service.translateSection(fields, 'fr');

      // Translate to Spanish (cached separately)
      await service.translateSection(fields, 'es');

      expect(userDataTranslationMock.translateUserFields).toHaveBeenCalledTimes(2);

      // Clear only French cache
      service.clearLanguageCache('fr');

      // Translate to French again (should call API)
      await service.translateSection(fields, 'fr');

      expect(userDataTranslationMock.translateUserFields).toHaveBeenCalledTimes(3);

      // Spanish should still be cached
      await service.translateSection(fields, 'es');
      expect(userDataTranslationMock.translateUserFields).toHaveBeenCalledTimes(3); // No new call
    });
  });

  describe('Large Profile Integration Test', () => {
    it('should handle complete large profile with all sections', async () => {
      // Simulate a large profile with all sections
      const largeProfile = {
        professional: {
          job_title: 'Senior Full-Stack Developer',
          industry: 'Technology & Software',
          occupation: 'Software Architect'
        },
        bio: 'Experienced developer with 12+ years in building scalable systems.',
        skills: Array.from({ length: 15 }, (_, i) => ({
          skill_name: `Skill ${i}: ` + 'Expert level skill description.'.repeat(2)
        })),
        experiences: Array.from({ length: 8 }, (_, i) => ({
          job_title: `Role ${i}`,
          company_name: `Company ${i}`,
          description: 'Managed large-scale projects, implemented microservices architecture.'.repeat(3),
          reason_for_leaving: 'Seeking new challenge'
        })),
        education: Array.from({ length: 3 }, (_, i) => ({
          degree: i === 0 ? 'Bachelor' : 'Master',
          field_of_study: 'Computer Science',
          institution: `University ${i}`,
          description: 'Specialized coursework in distributed systems.'
        })),
        certificates: Array.from({ length: 4 }, (_, i) => ({
          name: `Certification ${i}`,
          issuer: 'Tech Institute',
          description: 'Advanced course in cloud technologies.'
        }))
      };

      // Mock translations
      userDataTranslationMock.translateUserFields.and.returnValue(
        Promise.resolve({} as any) // Will be populated per call
      );

      // Translate all sections
      const promises = [
        service.translateSection(largeProfile.professional, 'fr'),
        service.translateSection({ bio: largeProfile.bio }, 'fr'),
        service.translateSkillsBulk(largeProfile.skills, 'fr'),
        service.translateExperienceBulk(largeProfile.experiences, 'fr'),
        service.translateEducationBulk(largeProfile.education, 'fr'),
        service.translateCertificatesBulk(largeProfile.certificates, 'fr')
      ];

      const results = await Promise.all(promises);

      // Verify all sections were processed
      expect(results.length).toBe(6);
      
      // Should make minimal API calls (1-2 per section depending on size)
      // Total should be 6-12 calls, not 100+
      const totalApiCalls = userDataTranslationMock.translateUserFields.calls.count();
      expect(totalApiCalls).toBeLessThan(15); // Should be well under 15
      console.log(`✅ Large profile translated with ${totalApiCalls} API calls`);
    });
  });
});
