import { db } from '@smartmath/database';

async function main() {
  const lessonWithQuizzes = await db.lesson.findFirst({
    where: {
      quizzes: {
        some: {}
      }
    },
    include: {
      quizzes: true
    }
  });

  if (!lessonWithQuizzes) {
    console.log("NO LESSON WITH QUIZZES FOUND IN DB.");
    return;
  }

  console.log("LESSON ID:", lessonWithQuizzes.id);
  console.log("QUIZZES IN DB:");
  console.log(JSON.stringify(lessonWithQuizzes.quizzes, null, 2));
}

main().catch(console.error).finally(() => process.exit(0));
