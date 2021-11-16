import { Lesson, LessonType } from "./models/lesson";
import { LessonInfo } from "./models/lessonInfo";
import { Schedule } from "./models/schedule";
import { Teacher } from "./models/teacher";

export class ScheduleParser {

    private document: Document;

    constructor(document: Document) {
        this.document = document;
    }

    public parseSchedulePage(): Schedule {
        const schedule = new Schedule();

        const firstWeekScheduleTable = <HTMLTableElement>this.document.getElementById("ctl00_MainContent_FirstScheduleTable");
        if (![7, 8].includes(firstWeekScheduleTable.rows.length)) {
            console.debug(`Received unexpected schedule table size: ${firstWeekScheduleTable.rows.length}`);
            return schedule;
        }
        const firstWeek = this.getLessonsFromTable(firstWeekScheduleTable!);
        const secondWeekScheduleTable = <HTMLTableElement>this.document.getElementById("ctl00_MainContent_SecondScheduleTable");
        const secondWeek = this.getLessonsFromTable(secondWeekScheduleTable!);

        // fill schedule from array
        for (let i = 0; i < 6; i++) {
            const firstDay = schedule.firstWeek[i];
            const secondDay = schedule.secondWeek[i];
            for (let j = 0; j < 6; j++) {
                const firstPair = firstDay.pairs[j];
                const secondPair = secondDay.pairs[j];
                firstPair.lessons = firstWeek[i][j];
                secondPair.lessons = secondWeek[i][j];
            }
        }

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
                lessons[i].push([]);
                lessons[i][j].push(...celllessons);
            }
        }

        return lessons;
    }

    private parseLessonNames(cell: HTMLTableCellElement): string[] {
        return Array.from(cell
            .getElementsByClassName("disLabel")[0].children)
            .map(a => (<HTMLElement>a).innerHTML);
    }

    private parseTeachers(cell: HTMLTableCellElement): Teacher[] {
        const shortNames = Array.from(
            cell.querySelectorAll("a[href*=\"Schedules/ViewSchedule\"]"))
            .map(a => (<HTMLElement>a).innerHTML);
        const fullNames = Array.from(
            cell.querySelectorAll("a[href*=\"Schedules/ViewSchedule\"]"))
            .map(a => (<HTMLElement>a).title);
        const links = Array.from(
            cell.querySelectorAll("a[href*=\"Schedules/ViewSchedule\"]"))
            .map(a => (<HTMLLinkElement>a).href);

        const teachers: Teacher[] = [];
        for (let i = 0; i < shortNames.length; i++) {
            const teacher = new Teacher();
            teacher.shortName = shortNames[i];
            teacher.fullName = fullNames[i];
            teacher.scheduleLink = "http://rozklad.kpi.ua" + links[i];
            teachers.push(teacher);
        }
        return teachers;
    }

    private parseLessonInfos(cell: HTMLTableCellElement): LessonInfo[] {
        const infos: LessonInfo[] = [];
        const lessonsInfoMatch = cell.innerHTML
            .match("(<\/a><br>|<br> |(?<!<\/span>)<br>)+(.+)$");

        if (lessonsInfoMatch == null) { // bs lesson without any infos
            return infos;
        }

        const lessonInfos = lessonsInfoMatch![2]
            .split(/(?!\d), (?!\d)/)
            .map(s => s.trim());

        for (const lessonInfoStr of lessonInfos) {
            const lessonInfo = lessonInfoStr.includes("maps.google.com") ?
                this.parseLinkInfo(lessonInfoStr) :
                this.parsePlainInfo(lessonInfoStr);
            infos.push(lessonInfo);
        }

        return infos;
    }

    private parsePlainInfo(lessonInfoStr: string): LessonInfo {
        const lessonInfo = new LessonInfo();
        lessonInfo.isOnline = lessonInfoStr.includes("on-line");
        lessonInfo.lessonType = lessonInfoStr.split(" ")[0];
        lessonInfo.roomNumber = "";

        return lessonInfo;
    }

    private createHtmlElement(htmlString: string): HTMLElement {
        const div = this.document.createElement("div");
        div.innerHTML = htmlString.trim();
        return <HTMLElement>div.firstChild!;
    }

    private parseLinkInfo(lessonInfoStr: string): LessonInfo {
        const element = this.createHtmlElement(lessonInfoStr);

        const room = element.innerHTML.substr(0, element.innerHTML.indexOf(' '));
        const lessonType = element.innerHTML.substr(element.innerHTML.indexOf(' ') + 1);
        const isOnlineLesson = element.innerHTML.includes("on-line");

        const info = new LessonInfo();
        info.isOnline = isOnlineLesson;
        info.lessonType = lessonType;
        info.roomNumber = room;
        return info;
    }

    private getLessonsInCell(cell: HTMLTableCellElement): Lesson[] {
        if (cell?.getElementsByClassName("disLabel")[0] == undefined) {
            return [];
        }

        const lessonNames = this.parseLessonNames(cell);
        const teachers = this.parseTeachers(cell);
        const lessonInfos = this.parseLessonInfos(cell);

        const lessons = [];
        // create lessons from lesson infos
        for (let i = 0; i < lessonNames.length; i++) {
            const lesson = new Lesson();
            lesson.subjectName = lessonNames[i];
            lesson.teacher = i >= teachers.length ?
                teachers[teachers.length - 1] :
                teachers[i];
            const lessonInfo = i >= lessonInfos.length ?
                lessonInfos[lessonInfos.length - 1] :
                lessonInfos[i];
            lesson.room = lessonInfo?.roomNumber ?? "";
            lesson.lessonType = this.parseLessonType(lessonInfo?.lessonType);
            lesson.isOnline = lessonInfo?.isOnline ?? false;
            lessons.push(lesson);
        }

        return lessons;
    }

    private parseLessonType(lessonTypeString: string | undefined): LessonType {
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
}
