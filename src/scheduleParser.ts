import { Lesson, LessonType } from "./models/lesson";
import { Schedule } from "./models/schedule";

export class ScheduleParser {

    private document: Document;

    constructor(document: Document) {
        this.document = document;
    }

    public parseSchedulePage(): Schedule {
        let schedule = new Schedule();
    
        let groupTitle = this.document.getElementById("ctl00_MainContent_lblHeader")!.innerHTML;
        schedule.groupName = groupTitle.substr(19);
    
        let firstWeekScheduleTable = <HTMLTableElement>this.document.getElementById("ctl00_MainContent_FirstScheduleTable");
        let secondWeekScheduleTable = <HTMLTableElement>this.document.getElementById("ctl00_MainContent_SecondScheduleTable");
        schedule.firstWeek = this.getLessonsFromTable(firstWeekScheduleTable!);
        schedule.secondWeek = this.getLessonsFromTable(secondWeekScheduleTable!);
    
        return schedule;
    }

    private getLessonsFromTable(scheduleTable: HTMLTableElement): Lesson[][][] {
        scheduleTable.deleteRow(0);
        let lessons: Lesson[][][] = [];
    
        for (let i = 0; i < 6; i++) {
            lessons.push([]);
            for (let j = 0; j < 6; j++) {
                let scheduleCell = scheduleTable.rows[j].cells[i + 1];
                let cellPairs = this.getLessonsInCell(scheduleCell);
                cellPairs.forEach(p => {
                    p.lessonId = j;
                    p.dayId = i;
                });
                lessons[i].push([]);
                lessons[i][j].push(...cellPairs);
            }
        }
    
        return lessons;
    }

    private getLessonsInCell(cell: HTMLTableCellElement): Lesson[] {
        if (cell.getElementsByClassName("disLabel")[0] == undefined) {
            return [];
        }
        
        let pairNames = Array.from(cell
            .getElementsByClassName("disLabel")[0].children)
            .map(a => (<HTMLElement>a).innerHTML);

            
        let teachers = Array.from(
            cell.querySelectorAll("a[href*=\"Schedules/ViewSchedule\"]"))
            .map(a => (<HTMLElement>a).innerHTML);
        let rooms = Array.from(
            cell.querySelectorAll("a[href*=\"maps.google.com\"]"))
            .map(a => (<HTMLElement>a).innerHTML.substr(0, (<HTMLElement>a).innerHTML.indexOf(' ')));
        let pairTypes = Array.from(
            cell.querySelectorAll("a[href*=\"maps.google.com\"]"))
            .map(a => (<HTMLElement>a).innerHTML.substr((<HTMLElement>a).innerHTML.indexOf(' ') + 1));
    
        var pairs = [];
        for (let i = 0; i < pairNames.length; i++) {
            var pair = new Lesson();
            pair.subjectName = pairNames[i];
            pair.teacherName = teachers[i];
            pair.room = rooms.length == pairNames.length ? rooms[i] : rooms[0];
            let lessonTypeString = pairTypes.length == pairNames.length ? pairTypes[i] : pairTypes[0];
            pair.lessonType = this.parseLessonType(lessonTypeString);
            pairs.push(pair);
        }
    
        return pairs;
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
