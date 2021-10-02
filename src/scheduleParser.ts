import { Lesson, LessonType } from "./models/lesson";
import { Schedule } from "./models/schedule";

export class ScheduleParser {

    private document: Document;

    constructor(document: Document) {
        this.document = document;
    }

    public parseSchedulePage(): Schedule {
        const schedule = new Schedule();
    
        const groupTitle = this.document.getElementById("ctl00_MainContent_lblHeader")!.innerHTML;
        schedule.groupName = groupTitle.substr(19);
    
        const firstWeekScheduleTable = <HTMLTableElement>this.document.getElementById("ctl00_MainContent_FirstScheduleTable");
        const secondWeekScheduleTable = <HTMLTableElement>this.document.getElementById("ctl00_MainContent_SecondScheduleTable");
        schedule.firstWeek = this.getLessonsFromTable(firstWeekScheduleTable!);
        schedule.secondWeek = this.getLessonsFromTable(secondWeekScheduleTable!);
    
        return schedule;
    }

    private getLessonsFromTable(scheduleTable: HTMLTableElement): Lesson[][][] {
        scheduleTable.deleteRow(0);
        const lessons: Lesson[][][] = [];
    
        for (let i = 0; i < 6; i++) {
            lessons.push([]);
            for (let j = 0; j < 6; j++) {
                const scheduleCell = scheduleTable.rows[j].cells[i + 1];
                const celllessons = this.getLessonsInCell(scheduleCell);
                celllessons.forEach(p => {
                    p.lessonId = j;
                    p.dayId = i;
                });
                lessons[i].push([]);
                lessons[i][j].push(...celllessons);
            }
        }
    
        return lessons;
    }

    private getLessonsInCell(cell: HTMLTableCellElement): Lesson[] {
        if (cell.getElementsByClassName("disLabel")[0] == undefined) {
            return [];
        }
        
        const lessonNames = Array.from(cell
            .getElementsByClassName("disLabel")[0].children)
            .map(a => (<HTMLElement>a).innerHTML);

            
        const teachers = Array.from(
            cell.querySelectorAll("a[href*=\"Schedules/ViewSchedule\"]"))
            .map(a => (<HTMLElement>a).innerHTML);
        const lessonInfos = Array.from(
            cell.querySelectorAll("a[href*=\"maps.google.com\"]"));
        const rooms = lessonInfos
            .map(a => (<HTMLElement>a).innerHTML.substr(0, (<HTMLElement>a).innerHTML.indexOf(' ')));
        const lessonTypes = lessonInfos
            .map(a => (<HTMLElement>a).innerHTML.substr((<HTMLElement>a).innerHTML.indexOf(' ') + 1));
        const areOnlineLessons = lessonInfos
            .map(a => (<HTMLElement>a).innerHTML.includes("on-line"));
    
        const lessons = [];
        for (let i = 0; i < lessonNames.length; i++) {
            const lesson = new Lesson();
            lesson.subjectName = lessonNames[i];
            lesson.teacherName = teachers[i];
            lesson.room = rooms.length == lessonNames.length ? rooms[i] : rooms[0];
            const lessonTypeString = lessonTypes.length == lessonNames.length ? lessonTypes[i] : lessonTypes[0];
            lesson.lessonType = this.parseLessonType(lessonTypeString);
            lesson.isOnline = areOnlineLessons[i];
            lessons.push(lesson);
        }
    
        return lessons;
    }

    private parseLessonType(lessonTypeString: string): LessonType {
        switch (lessonTypeString) {
            case "Лек":
                return LessonType.Lecture;
            case "Прак":
                return LessonType.Practicum;
            case "Лаб":
                return LessonType.Lab;
            default:
                return LessonType.Lecture;
        }
    }
}
