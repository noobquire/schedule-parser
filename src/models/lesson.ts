import { Teacher } from "./teacher";

export class Lesson {
    subjectName: string;
    teacher: Teacher;
    room: string;
    lessonType: LessonType;
    isOnline: boolean;
}

export enum LessonType {
    Lecture = "Лекція",
    Lab = "Лабораторна",
    Practicum = "Практика"
}
