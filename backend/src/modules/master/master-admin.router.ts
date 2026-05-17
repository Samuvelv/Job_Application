// src/modules/master/master-admin.router.ts
// Admin-only CRUD routes for all master data tables.
// Mounted at /api/v1/admin/master in app.ts
import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize }    from '../../middleware/authorize';
import {
  listRecords,
  getRecord,
  createRecord,
  updateRecord,
  deleteRecord,
  restoreRecord,
  getCounts,
} from './master-admin.controller';

const router = Router();

// All routes require admin auth
router.use(authenticate, authorize('admin'));

// ── CRUD endpoints ────────────────────────────────────────────────────────────
// :table is validated against ALLOWED_TABLES whitelist inside the controller
// NOTE: /counts must be declared BEFORE /:table to avoid being matched as a table name
router.get   ('/counts',             getCounts);
router.get   ('/:table',             listRecords);
router.get   ('/:table/:id',         getRecord);
router.post  ('/:table',             createRecord);
router.put   ('/:table/:id',         updateRecord);
router.delete('/:table/:id',         deleteRecord);
router.patch ('/:table/:id/restore', restoreRecord);

export default router;
