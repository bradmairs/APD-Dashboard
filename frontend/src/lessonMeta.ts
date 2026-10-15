import { LessonType } from "./types";

export const LESSON_TYPE_LABELS: Record<LessonType, string> = {
  POSITIVE: "What Went Well",
  NEGATIVE: "What to Improve",
};

export const LESSON_TYPE_COLORS: Record<LessonType, string> = {
  POSITIVE: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  NEGATIVE: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
};

export const ALL_LESSON_TYPES: LessonType[] = ["POSITIVE", "NEGATIVE"];
