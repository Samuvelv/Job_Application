// migrations/20240021_add_profile_fields_to_recruiters.ts
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const [hasCountry, hasIndustry, hasLicence, hasLicenceCountries] =
    await Promise.all([
      knex.schema.hasColumn('recruiters', 'company_country'),
      knex.schema.hasColumn('recruiters', 'industry'),
      knex.schema.hasColumn('recruiters', 'has_sponsor_licence'),
      knex.schema.hasColumn('recruiters', 'sponsor_licence_countries'),
    ]);

  await knex.schema.alterTable('recruiters', (t) => {
    if (!hasCountry)          t.string('company_country', 100).nullable();
    if (!hasIndustry)         t.string('industry', 150).nullable();
    if (!hasLicence)          t.string('has_sponsor_licence', 10).nullable(); // 'yes' | 'no' | 'unknown'
    if (!hasLicenceCountries) t.specificType('sponsor_licence_countries', 'text[]').nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  const [hasCountry, hasIndustry, hasLicence, hasLicenceCountries] =
    await Promise.all([
      knex.schema.hasColumn('recruiters', 'company_country'),
      knex.schema.hasColumn('recruiters', 'industry'),
      knex.schema.hasColumn('recruiters', 'has_sponsor_licence'),
      knex.schema.hasColumn('recruiters', 'sponsor_licence_countries'),
    ]);

  await knex.schema.alterTable('recruiters', (t) => {
    if (hasLicenceCountries) t.dropColumn('sponsor_licence_countries');
    if (hasLicence)          t.dropColumn('has_sponsor_licence');
    if (hasIndustry)         t.dropColumn('industry');
    if (hasCountry)          t.dropColumn('company_country');
  });
}
