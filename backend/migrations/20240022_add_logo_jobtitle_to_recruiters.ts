// migrations/20240022_add_logo_jobtitle_to_recruiters.ts
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const [hasLogo, hasJobTitle] = await Promise.all([
    knex.schema.hasColumn('recruiters', 'company_logo_url'),
    knex.schema.hasColumn('recruiters', 'contact_job_title'),
  ]);

  await knex.schema.alterTable('recruiters', (t) => {
    if (!hasLogo)     t.text('company_logo_url').nullable();
    if (!hasJobTitle) t.string('contact_job_title', 150).nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  const [hasLogo, hasJobTitle] = await Promise.all([
    knex.schema.hasColumn('recruiters', 'company_logo_url'),
    knex.schema.hasColumn('recruiters', 'contact_job_title'),
  ]);

  await knex.schema.alterTable('recruiters', (t) => {
    if (hasJobTitle) t.dropColumn('contact_job_title');
    if (hasLogo)     t.dropColumn('company_logo_url');
  });
}
