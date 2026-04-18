// src/modules/master/master.router.ts
import { Router } from 'express';
import {
  getCountries,
  getCities,
  getJobTitles,
  getOccupations,
  getIndustries,
  getLanguages,
  getDegrees,
  getFieldsOfStudy,
  getCurrencies,
  getNoticePeriods,
  getHobbies,
} from './master.controller';

const router = Router();

// All master-data endpoints are public (no auth required)
router.get('/countries',        getCountries);
router.get('/cities',           getCities);
router.get('/job-titles',       getJobTitles);
router.get('/occupations',      getOccupations);
router.get('/industries',       getIndustries);
router.get('/languages',        getLanguages);
router.get('/degrees',          getDegrees);
router.get('/fields-of-study',  getFieldsOfStudy);
router.get('/currencies',       getCurrencies);
router.get('/notice-periods',   getNoticePeriods);
router.get('/hobbies',          getHobbies);

export default router;
