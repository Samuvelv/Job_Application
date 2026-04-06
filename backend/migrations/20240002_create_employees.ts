// migrations/20240002_create_employees.ts
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('employees', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').unique().notNullable().references('id').inTable('users').onDelete('CASCADE');

    // Personal
    t.string('first_name', 100).notNullable();
    t.string('last_name', 100).notNullable();
    t.date('date_of_birth').nullable();
    t.string('gender', 20).nullable();
    t.string('phone', 30).nullable();
    t.text('profile_photo_url').nullable();
    t.text('bio').nullable();

    // Professional
    t.string('job_title', 150).nullable();
    t.string('occupation', 150).nullable();
    t.string('industry', 150).nullable();
    t.smallint('years_experience').nullable();
    t.text('linkedin_url').nullable();

    // Location
    t.string('current_country', 100).nullable();
    t.string('current_city', 100).nullable();
    t.string('nationality', 100).nullable();
    t.specificType('target_locations', 'text[]').nullable();

    // Salary
    t.decimal('salary_min', 12, 2).nullable();
    t.decimal('salary_max', 12, 2).nullable();
    t.string('salary_currency', 10).nullable();
    t.string('salary_type', 20).nullable(); // monthly/annual/hourly

    // Files
    t.text('resume_url').nullable();
    t.text('intro_video_url').nullable();

    // Status
    t.string('profile_status', 30).defaultTo('active');

    t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    t.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('employee_skills', (t) => {
    t.increments('id').primary();
    t.uuid('employee_id').notNullable().references('id').inTable('employees').onDelete('CASCADE');
    t.string('skill_name', 100).notNullable();
    t.string('proficiency', 30).nullable();
  });

  await knex.schema.createTable('employee_languages', (t) => {
    t.increments('id').primary();
    t.uuid('employee_id').notNullable().references('id').inTable('employees').onDelete('CASCADE');
    t.string('language', 100).notNullable();
    t.string('proficiency', 30).nullable();
  });

  await knex.schema.createTable('employee_experience', (t) => {
    t.increments('id').primary();
    t.uuid('employee_id').notNullable().references('id').inTable('employees').onDelete('CASCADE');
    t.string('company_name', 200).nullable();
    t.string('job_title', 150).nullable();
    t.date('start_date').nullable();
    t.date('end_date').nullable();
    t.text('description').nullable();
    t.string('location', 150).nullable();
  });

  await knex.schema.createTable('employee_education', (t) => {
    t.increments('id').primary();
    t.uuid('employee_id').notNullable().references('id').inTable('employees').onDelete('CASCADE');
    t.string('institution', 200).nullable();
    t.string('degree', 100).nullable();
    t.string('field_of_study', 150).nullable();
    t.smallint('start_year').nullable();
    t.smallint('end_year').nullable();
    t.string('location', 150).nullable();
  });

  await knex.schema.createTable('employee_certificates', (t) => {
    t.increments('id').primary();
    t.uuid('employee_id').notNullable().references('id').inTable('employees').onDelete('CASCADE');
    t.string('name', 200).nullable();
    t.string('issuer', 200).nullable();
    t.date('issue_date').nullable();
    t.text('file_url').nullable();
  });

  await knex.schema.createTable('profile_edit_requests', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('employee_id').notNullable().references('id').inTable('employees').onDelete('CASCADE');
    t.jsonb('requested_data').notNullable();
    t.string('status', 20).defaultTo('pending'); // pending/approved/rejected
    t.text('admin_note').nullable();
    t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    t.timestamp('reviewed_at', { useTz: true }).nullable();
  });

  // Indexes
  await knex.raw('CREATE INDEX idx_employees_industry   ON employees(industry)');
  await knex.raw('CREATE INDEX idx_employees_occupation ON employees(occupation)');
  await knex.raw('CREATE INDEX idx_employees_country    ON employees(current_country)');
  await knex.raw('CREATE INDEX idx_employee_skills      ON employee_skills(skill_name)');
  await knex.raw('CREATE INDEX idx_employee_languages   ON employee_languages(language)');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('profile_edit_requests');
  await knex.schema.dropTableIfExists('employee_certificates');
  await knex.schema.dropTableIfExists('employee_education');
  await knex.schema.dropTableIfExists('employee_experience');
  await knex.schema.dropTableIfExists('employee_languages');
  await knex.schema.dropTableIfExists('employee_skills');
  await knex.schema.dropTableIfExists('employees');
}
