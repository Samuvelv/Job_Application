import type { Knex } from 'knex';

// Maps legacy free-text proficiency values to the closest CEFR equivalent.
// basic         → A1  (elementary, foundational)
// conversational → B1  (independent, can hold basic conversation)
// fluent         → C1  (proficient, near-native fluency)
// native         → native (unchanged)
const MAPPING: Record<string, string> = {
  basic:          'A1',
  conversational: 'B1',
  fluent:         'C1',
  native:         'native',
};

export async function up(knex: Knex): Promise<void> {
  for (const [legacy, cefr] of Object.entries(MAPPING)) {
    await knex('candidate_languages')
      .whereRaw('LOWER(proficiency) = ?', [legacy])
      .update({ proficiency: cefr });
  }
}

export async function down(knex: Knex): Promise<void> {
  // Reverse: map CEFR back to legacy values.
  // Note: A2, B2, C2 have no legacy equivalent — they are left as-is on rollback.
  const reverse: Record<string, string> = {
    A1:     'basic',
    B1:     'conversational',
    C1:     'fluent',
    native: 'native',
  };
  for (const [cefr, legacy] of Object.entries(reverse)) {
    await knex('candidate_languages')
      .where({ proficiency: cefr })
      .update({ proficiency: legacy });
  }
}
