// migrations/20240040_add_whatsapp_number_to_candidates.ts
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema.hasColumn('candidates', 'whatsapp_number');
  if (!hasColumn) {
    await knex.schema.alterTable('candidates', (t) => {
      t.string('whatsapp_number', 50).nullable();
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema.hasColumn('candidates', 'whatsapp_number');
  if (hasColumn) {
    await knex.schema.alterTable('candidates', (t) => {
      t.dropColumn('whatsapp_number');
    });
  }
}
