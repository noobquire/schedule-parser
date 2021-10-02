export class Lesson {
    subjectName: string;
    teacherName: string;
    lessonId: number;
    dayId: number;
    room: string;
    lessonType: LessonType;
    isOnline: boolean;
}

export enum LessonType {
    Lecture = "Лекція",
    Lab = "Лабораторна",
    Practicum = "Практика"
}