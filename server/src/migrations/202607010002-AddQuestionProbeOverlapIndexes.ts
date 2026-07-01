import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddQuestionProbeOverlapIndexes202607010002
  implements MigrationInterface
{
  name = 'AddQuestionProbeOverlapIndexes202607010002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_question_probes_status"
      ON "question_probes" ("status")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_question_probes_role_families"
      ON "question_probes" USING GIN ("roleFamilies")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_question_probes_levels"
      ON "question_probes" USING GIN ("levels")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_question_probes_competencies"
      ON "question_probes" USING GIN ("competencies")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_question_probes_tech_tags"
      ON "question_probes" USING GIN ("techTags")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_question_probes_topic_tags"
      ON "question_probes" USING GIN ("topicTags")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_question_probes_topic_tags"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_question_probes_tech_tags"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_question_probes_competencies"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_question_probes_levels"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_question_probes_role_families"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_question_probes_status"`);
  }
}
