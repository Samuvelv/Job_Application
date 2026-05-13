// migrations/20240024_add_extended_fields_to_recruiters.ts
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const [hasPhone, hasWebsite, hasCity, hasLicenceNo, hasNats, hasHires, hasNotes] =
    await Promise.all([
      knex.schema.hasColumn('recruiters', 'phone'),
      knex.schema.hasColumn('recruiters', 'company_website'),
      knex.schema.hasColumn('recruiters', 'company_city'),
      knex.schema.hasColumn('recruiters', 'sponsor_licence_number'),
      knex.schema.hasColumn('recruiters', 'target_nationalities'),
      knex.schema.hasColumn('recruiters', 'hires_per_year'),
      knex.schema.hasColumn('recruiters', 'admin_notes'),
    ]);

  await knex.schema.alterTable('recruiters', (t) => {
    if (!hasPhone)     t.string('phone', 50).nullable();
    if (!hasWebsite)   t.string('company_website', 300).nullable();
    if (!hasCity)      t.string('company_city', 100).nullable();
    if (!hasLicenceNo) t.string('sponsor_licence_number', 100).nullable();
    if (!hasNats)      t.specificType('target_nationalities', 'text[]').nullable();
    if (!hasHires)     t.string('hires_per_year', 50).nullable();
    if (!hasNotes)     t.text('admin_notes').nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  const [hasPhone, hasWebsite, hasCity, hasLicenceNo, hasNats, hasHires, hasNotes] =
    await Promise.all([
      knex.schema.hasColumn('recruiters', 'phone'),
      knex.schema.hasColumn('recruiters', 'company_website'),
      knex.schema.hasColumn('recruiters', 'company_city'),
      knex.schema.hasColumn('recruiters', 'sponsor_licence_number'),
      knex.schema.hasColumn('recruiters', 'target_nationalities'),
      knex.schema.hasColumn('recruiters', 'hires_per_year'),
      knex.schema.hasColumn('recruiters', 'admin_notes'),
    ]);

  await knex.schema.alterTable('recruiters', (t) => {
    if (hasNotes)     t.dropColumn('admin_notes');
    if (hasHires)     t.dropColumn('hires_per_year');
    if (hasNats)      t.dropColumn('target_nationalities');
    if (hasLicenceNo) t.dropColumn('sponsor_licence_number');
    if (hasCity)      t.dropColumn('company_city');
    if (hasWebsite)   t.dropColumn('company_website');
    if (hasPhone)     t.dropColumn('phone');
  });
}
