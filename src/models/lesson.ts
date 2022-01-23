import { Teacher } from "./teacher";

export class Lesson {
    subjectName: string;
    subjectFullName: string | undefined;
    teachers: Teacher[] = [];
    rooms: string[] = [];
    lessonType: LessonType;
    isOnline: boolean;
}

export enum LessonType {
    Lecture = "Лекція",
    Lab = "Лабораторна",
    Practicum = "Практика"
}

export function parseLessonType(lessonTypeString: string | undefined): LessonType {
    if (lessonTypeString?.includes("Лек")) {
        return LessonType.Lecture;
    }

    if (lessonTypeString?.includes("Прак")) {
        return LessonType.Practicum;
    }

    if (lessonTypeString?.includes("Лаб")) {
        return LessonType.Lab;
    }

    return LessonType.Lecture;
}
