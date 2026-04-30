// migrations/20240022_add_logo_jobtitle_to_recruiters.ts
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('recruiters', (t) => {
    t.text('company_logo_url').nullable();
    t.string('contact_job_title', 150).nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('recruiters', (t) => {
    t.dropColumn('contact_job_title');
    t.dropColumn('company_logo_url');
  });
}
