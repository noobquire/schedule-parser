import { LessonType } from "./lesson";

export class TeacherPair {
    subjectName: string;
    subjectFullName: string | undefined;
    room: string;
    lessonType: LessonType;
    isOnline: boolean;
    groups: string[];
}
