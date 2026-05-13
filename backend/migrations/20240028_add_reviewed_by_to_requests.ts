// migrations/20240028_add_reviewed_by_to_requests.ts
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const [hasEditReviewedBy, hasContactReviewedBy] = await Promise.all([
    knex.schema.hasColumn('profile_edit_requests', 'reviewed_by_id'),
    knex.schema.hasColumn('contact_unlock_requests', 'reviewed_by_id'),
  ]);

  if (!hasEditReviewedBy) {
    await knex.schema.alterTable('profile_edit_requests', (t) => {
      t.uuid('reviewed_by_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    });
  }

  if (!hasContactReviewedBy) {
    await knex.schema.alterTable('contact_unlock_requests', (t) => {
      t.uuid('reviewed_by_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const [hasEditReviewedBy, hasContactReviewedBy] = await Promise.all([
    knex.schema.hasColumn('profile_edit_requests', 'reviewed_by_id'),
    knex.schema.hasColumn('contact_unlock_requests', 'reviewed_by_id'),
  ]);

  if (hasEditReviewedBy) {
    await knex.schema.alterTable('profile_edit_requests', (t) => {
      t.dropColumn('reviewed_by_id');
    });
  }

  if (hasContactReviewedBy) {
    await knex.schema.alterTable('contact_unlock_requests', (t) => {
      t.dropColumn('reviewed_by_id');
    });
  }
}
