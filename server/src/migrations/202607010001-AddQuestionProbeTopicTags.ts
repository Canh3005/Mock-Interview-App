import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddQuestionProbeTopicTags202607010001 implements MigrationInterface {
  name = 'AddQuestionProbeTopicTags202607010001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "question_probes"
      ADD COLUMN IF NOT EXISTS "topicTags" text[] NOT NULL DEFAULT '{}'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "question_probes"
      DROP COLUMN IF EXISTS "topicTags"
    `);
  }
}
