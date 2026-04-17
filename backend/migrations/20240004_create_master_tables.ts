// migrations/20240004_create_master_tables.ts
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. Countries (includes dial code for phone picker)
  await knex.schema.createTable('master_countries', (t) => {
    t.increments('id').primary();
    t.string('name', 100).notNullable();
    t.string('iso2', 2).notNullable().unique();
    t.string('dial_code', 10).notNullable();
    t.string('flag_emoji', 10).nullable();
  });

  // 2. Cities (linked to country)
  await knex.schema.createTable('master_cities', (t) => {
    t.increments('id').primary();
    t.integer('country_id').notNullable().references('id').inTable('master_countries').onDelete('CASCADE');
    t.string('name', 150).notNullable();
  });
  await knex.raw('CREATE INDEX idx_master_cities_country ON master_cities(country_id)');

  // 3. Occupations (parent of job titles)
  await knex.schema.createTable('master_occupations', (t) => {
    t.increments('id').primary();
    t.string('name', 100).notNullable().unique();
  });

  // 4. Job Titles (linked to occupation)
  await knex.schema.createTable('master_job_titles', (t) => {
    t.increments('id').primary();
    t.integer('occupation_id').notNullable().references('id').inTable('master_occupations').onDelete('CASCADE');
    t.string('title', 150).notNullable();
  });
  await knex.raw('CREATE INDEX idx_master_job_titles_occ ON master_job_titles(occupation_id)');

  // 5. Industries
  await knex.schema.createTable('master_industries', (t) => {
    t.increments('id').primary();
    t.string('name', 100).notNullable().unique();
  });

  // 6. Languages
  await knex.schema.createTable('master_languages', (t) => {
    t.increments('id').primary();
    t.string('name', 100).notNullable().unique();
  });

  // 7. Degrees
  await knex.schema.createTable('master_degrees', (t) => {
    t.increments('id').primary();
    t.string('name', 150).notNullable().unique();
  });

  // 8. Fields of Study
  await knex.schema.createTable('master_fields_of_study', (t) => {
    t.increments('id').primary();
    t.string('name', 150).notNullable().unique();
  });

  // 9. Currencies
  await knex.schema.createTable('master_currencies', (t) => {
    t.increments('id').primary();
    t.string('code', 10).notNullable().unique();
    t.string('name', 100).notNullable();
    t.string('symbol', 10).nullable();
  });

  // 10. Notice Periods
  await knex.schema.createTable('master_notice_periods', (t) => {
    t.increments('id').primary();
    t.string('label', 100).notNullable().unique();
    t.integer('days').notNullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('master_notice_periods');
  await knex.schema.dropTableIfExists('master_currencies');
  await knex.schema.dropTableIfExists('master_fields_of_study');
  await knex.schema.dropTableIfExists('master_degrees');
  await knex.schema.dropTableIfExists('master_languages');
  await knex.schema.dropTableIfExists('master_industries');
  await knex.schema.dropTableIfExists('master_job_titles');
  await knex.schema.dropTableIfExists('master_occupations');
  await knex.schema.dropTableIfExists('master_cities');
  await knex.schema.dropTableIfExists('master_countries');
}
