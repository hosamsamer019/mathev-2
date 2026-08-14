/**
 * MIGRATION COMPLETE — DO NOT RUN AGAIN
 *
 * This script was used to migrate all 44 legacy `Question` records into `QuestionBank`.
 *
 * Results (executed 2026-08-14):
 *   - Legacy Question records before migration : 44
 *   - QuestionBank records before migration    : 0
 *   - Successfully migrated                    : 44
 *   - Failed                                   : 0
 *   - Skipped                                  : 0
 *   - Duplicates                               : 0
 *   - Content integrity                        : 100%
 *   - Teacher ownership mapping                : 100%
 *
 * Post-migration state (verified and FINAL):
 *   - Legacy `Question` model     : DELETED from schema + DB
 *   - Legacy `Question` migration : Applied (20260814203400_remove_legacy_question)
 *   - QuestionBank records        : 44 (all original records preserved)
 *   - Backup                      : question_backup_pre_migration_*.json in project root
 *
 * Field mappings used:
 *   Question.teacherId    → QuestionBank.creatorId
 *   Question.tag          → QuestionBank.tag + QuestionBank.topic
 *   Question.text         → QuestionBank.text
 *   Question.options      → QuestionBank.options
 *   Question.correctAnswer→ QuestionBank.correctAnswer
 *   Question.type         → QuestionBank.type
 *   Question.createdAt    → QuestionBank.createdAt
 *   Question.updatedAt    → QuestionBank.updatedAt
 *
 * This file is preserved as a historical record only.
 */

export {};
