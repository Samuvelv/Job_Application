import type { Knex } from 'knex';

// The "no visa" option's stored value was reworded from an em-dash phrasing
// to the current wording. Existing rows still hold the old text, which no
// longer matches VISA_STATUS_OPTIONS in the frontend.
const OLD_VALUE = 'No visa — need full sponsorship';
const NEW_VALUE = 'No Visa - Requires full visa sponsorship';

export async function up(knex: Knex): Promise<void> {
  await knex('candidates')
    .where('visa_status', OLD_VALUE)
    .update({ visa_status: NEW_VALUE, updated_at: knex.fn.now() });
}

export async function down(knex: Knex): Promise<void> {
  await knex('candidates')
    .where('visa_status', NEW_VALUE)
    .update({ visa_status: OLD_VALUE, updated_at: knex.fn.now() });
}
