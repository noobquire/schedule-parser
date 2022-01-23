import { LessonType } from "./lesson";
import { Teacher } from "./teacher";

/**
 * A pair in teachers's schedule. 
 * Cannot have several lessons because teacher can conduct only one at a time.
 */
export class TeacherPair {
    teacher: Teacher;
    subjectName: string;
    subjectFullName: string | undefined;
    room: string;
    lessonType: LessonType;
    isOnline: boolean;
    groups: string[];
}
