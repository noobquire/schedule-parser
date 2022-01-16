import { JSDOM } from "jsdom";
import { Lesson, parseLessonType } from "../models/lesson";
import { LessonInfo } from "../models/lessonInfo";
import { Pair } from "../models/pair";
import { PairIdentifier } from "../models/pairIdentifier";
import { Teacher } from "../models/teacher";
import { TeacherScheduleParser } from "../teacherScheduleParser";
import { Parser } from "./parser";

/**
* Used to get all lessons from single schedule table pair cell
*/ 
export class PairParser implements Parser<Pair> {
    private cell: HTMLTableCellElement;
    private pairId: PairIdentifier;

    /**
     * Init new instance from schedule table cell
     */
    constructor(cell: HTMLTableCellElement, pairId: PairIdentifier) {
        this.cell = cell;
        this.pairId = pairId;
    }

    async parse(): Promise<Pair> {
        const lessons = await this.parseLessonsInCell(this.cell);
        const pairNumber = this.pairId.pairIndex + 1;
        const pair = new Pair(pairNumber, lessons);
        return pair;
    }

    private async parseLessonsInCell(cell: HTMLTableCellElement): Promise<Lesson[]> {
        // if no lesson names, this cell is empty
        if (cell?.getElementsByClassName("disLabel")[0] == undefined) {
            return [];
        }

        const lessonNames = this.parseLessonNames(cell);
        const lessonFullNames = this.parseLessonFullNames(cell);
        const teachers = this.parseTeachers(cell);
        let lessonInfos = this.parseLessonInfos(cell);

        // these conditions are a crutch for cases when amount
        // of lesson names, teachers and lesson infos does not match
        // p.s. in some rare cases there can be no teachers or lesson infos, ex. 'АМ-01'
        const severalTeachersPerLesson = lessonNames.length > teachers.length;
        
        const lessInfosThanTeachers = lessonNames.length == teachers.length && lessonInfos.length < lessonNames.length && lessonNames.length > 0;
        if (lessInfosThanTeachers) {
            console.debug(`handling less infos than teachers: ${lessonNames.length} lessons, ${teachers.length} teachers, ${lessonInfos.length} infos in ${this.pairId}`);
            const teacherLessonInfos = await Promise.all(teachers.map(async t => {
                const teacherScheduleParser = new TeacherScheduleParser(t.scheduleUuid);
                await teacherScheduleParser.init();
                const info = new LessonInfo();
                const teacherPair = teacherScheduleParser.parsePair(this.pairId);
                info.isOnline = teacherPair.isOnline;
                info.lessonType = teacherPair.lessonType;
                info.roomNumber = teacherPair.room;
                return info;
            })).then();
            lessonInfos = teacherLessonInfos;
        } else if(severalTeachersPerLesson) {
            console.debug(`handling several teachers per lesson: ${lessonNames.length} lessons, ${teachers.length} teachers, ${lessonInfos.length} infos in ${this.pairId}`)
            if(lessonNames.length == 1) {
                
            }
        }
        else if (lessonNames.length != teachers.length || lessonNames.length != lessonInfos.length) {
            console.warn(`${lessonNames.length} lessons, ${teachers.length} teachers, ${lessonInfos.length} infos in ${this.pairId}`);
            // TODO: think how we can fix this
        }

        const lessons = [];
        // create lessons from lesson infos
        for (let i = 0; i < lessonNames.length; i++) {
            const lesson = new Lesson();
            const lessonName = lessonNames[i];
            const lessonFullName = lessonFullNames[i];
            lesson.subjectName = lessonName;
            lesson.subjectFullName = lessonName == lessonFullName ? undefined : lessonFullName;

            if (lessonNames.length == 1 && teachers.length > 1) {
                lesson.teachers = teachers;
            } else if(i >= teachers.length) {
                lesson.teachers = [teachers[teachers.length - 1]];
            } else {
                lesson.teachers = [teachers[i]];
            }

            const lessonInfo = i >= lessonInfos.length ?
                lessonInfos[lessonInfos.length - 1] :
                lessonInfos[i];
            lesson.room = lessonInfo?.roomNumber ?? "";
            lesson.lessonType = parseLessonType(lessonInfo?.lessonType);
            lesson.isOnline = lessonInfo?.isOnline ?? false;
            lessons.push(lesson);
        }

        return lessons;
    }

    private parseLessonNames(cell: HTMLTableCellElement): string[] {
        return Array.from(cell
            .getElementsByClassName("disLabel")[0].children)
            .map(a => (<HTMLElement>a).innerHTML);
    }

    private parseLessonFullNames(cell: HTMLTableCellElement): string[] {
        return Array.from(cell
            .getElementsByClassName("disLabel")[0].children)
            .map(a => (<HTMLLinkElement>a).title);
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
        const scheduleLinkPrefix = "/Schedules/ViewSchedule.aspx?v=";
        for (let i = 0; i < shortNames.length; i++) {
            const teacher = new Teacher();
            teacher.shortName = shortNames[i];
            teacher.fullName = fullNames[i];
            teacher.scheduleUuid = links[i].substr(scheduleLinkPrefix.length);
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
            .split(/(?!\d), (?!\d)/) // room map coordinates can be two numbers separated by ', ', ignore that 
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
        const doc = new JSDOM().window.document;
        const div = doc.createElement("div");
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
}
