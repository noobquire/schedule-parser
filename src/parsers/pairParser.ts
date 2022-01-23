import { JSDOM } from "jsdom";
import { Lesson, parseLessonType } from "../models/lesson";
import { LessonInfo } from "../models/lessonInfo";
import { GroupPair } from "../models/groupPair";
import { PairIdentifier } from "../models/pairIdentifier";
import { Teacher } from "../models/teacher";
import { TeacherScheduleParser } from "../teacherScheduleParser";
import { Parser } from "./parser";
import { TeacherPair } from "../models/teacherPair";

/**
* Used to get all lessons from single schedule table pair cell
*/
export class PairParser implements Parser<GroupPair> {
    private cell: HTMLTableCellElement;
    private pairId: PairIdentifier;
    private lessonNames: string[];
    private lessonFullNames: string[];
    /**
     * Some lessons may have several teachers
     */
    private teachers: Teacher[][];
    private lessonInfos: LessonInfo[];

    /**
     * Init new instance from schedule table cell
     */
    constructor(cell: HTMLTableCellElement, pairId: PairIdentifier) {
        this.cell = cell;
        this.pairId = pairId;
    }

    async parse(): Promise<GroupPair> {
        const lessons = await this.parseLessonsInCell(this.cell);
        const pairNumber = this.pairId.pairIndex + 1;
        const pair = new GroupPair(pairNumber, lessons);
        return pair;
    }

    private async parseLessonsInCell(cell: HTMLTableCellElement): Promise<Lesson[]> {
        // if no lesson names, this cell is empty
        if (cell?.getElementsByClassName("disLabel")[0] == undefined) {
            return [];
        }

        this.lessonNames = this.parseLessonNames(cell);
        this.lessonFullNames = this.parseLessonFullNames(cell);
        this.teachers = this.parseTeachers(cell);
        this.lessonInfos = this.parseLessonInfos(cell);

        await this.fixLessonData();

        const lessons = [];
        // create lessons from lesson infos
        for (let i = 0; i < this.lessonNames.length; i++) {
            const lesson = new Lesson();
            const lessonName = this.lessonNames[i];
            const lessonFullName = this.lessonFullNames[i];
            lesson.subjectName = lessonName;
            lesson.subjectFullName = lessonName == lessonFullName ? undefined : lessonFullName;
            lesson.teachers = this.teachers[i] ?? [];

            const lessonInfo = i >= this.lessonInfos.length ?
                this.lessonInfos[this.lessonInfos.length - 1] :
                this.lessonInfos[i];
            lesson.rooms = lessonInfo?.roomNumbers ?? [];
            lesson.lessonType = parseLessonType(lessonInfo?.lessonType);
            lesson.isOnline = lessonInfo?.isOnline ?? false;
            lessons.push(lesson);
        }

        return lessons;
    }

    /**
     * TODO: Has a ton of side effects, think how can we refactor this
     */
    private async fixLessonData() {
        // in some rare cases amount of lesson names, teachers and lesson infos does not match
        // sometimes there can be no teachers or lesson infos, ex. 'АМ-01'

        if (this.lessonNames.length == this.teachers.length && this.lessonNames.length == this.lessonInfos.length) {
            // everything is ok, no need to fix
            return;
        } else {
            console.warn(`${this.lessonNames.length} lessons, ${this.teachers.length} teachers, ${this.lessonInfos.length} infos in ${this.pairId}`);
        }

        const severalTeachersPerLesson = this.lessonNames.length < this.teachers.length && this.teachers.length > 0;

        const lessInfosThanTeachers = this.lessonInfos.length < this.lessonNames.length && this.lessonNames.length > 0;

        const severalRoomsPerLesson = this.lessonInfos.length > this.lessonNames.length && this.lessonNames.length == this.teachers.length;

        const lessTeachersThanLessons = this.lessonNames.length > this.teachers.length && this.teachers.length > 0;

        if (severalTeachersPerLesson && this.lessonNames.length == 1) {
            console.debug(`handling single lesson with several teachers`);
            this.teachers[0] = this.teachers.flat();
        } else if (severalTeachersPerLesson && this.lessonNames.length > 1) {
            console.debug(`handling some lessons with several teachers`);
            // go through each teacher's schedule and group them by subject name
            const teachersPairs = await this.getTeachersPairs(this.teachers, this.pairId);
            const grouppedTeachers = <TeacherPair[][]>this.groupBy(teachersPairs, 'subjectName');
            this.teachers = grouppedTeachers.map(g => g.map(t => t.teacher));
        }

        if (lessInfosThanTeachers && this.lessonInfos.length == 1) {
            console.debug(`copying single lesson info to all lessons`)
            this.lessonInfos = Array(this.lessonNames.length).fill(this.lessonInfos[0]);
        }
        else if (lessInfosThanTeachers && this.lessonInfos.length > 1) {
            console.debug(`handling less infos than teachers`);
            // go thorough each teacher's schedule and find info for this lesson
            const teacherLessonInfos = await this.getTeachersLessonInfos(this.teachers, this.pairId);
            this.lessonInfos = teacherLessonInfos;
        }

        if (severalRoomsPerLesson && this.lessonNames.length == 1) {
            console.debug('handling one lesson with several rooms');
            this.lessonInfos[0].roomNumbers = this.lessonInfos.flatMap(i => i.roomNumbers);
            this.lessonInfos = [this.lessonInfos[0]];
        } else if (severalRoomsPerLesson) {
            console.debug('handling some lessons with several rooms');
            // only three such cases throughout all schedules were found, this is low priority for now
            // TODO: to handle, go through teacher's schedules and get rooms for each lesson
        }

        if (lessTeachersThanLessons && this.teachers.length == 1) {
            console.debug('handling several lessons per single teacher');
            // copy teacher to all lessons
            // this can happen with physics, which has several lessons depending on current week
            const newTeachers = Array<Array<Teacher>>(this.lessonNames.length);
            for (let i = 0; i < newTeachers.length; i++) {
                newTeachers[i] = this.teachers[0];
            }
            this.teachers = newTeachers;
        } else if (lessTeachersThanLessons) {
            console.debug('handling less teachers than lessons');
            // look at teacher's schedule, distribute teachers by subject names
            // and leave some lessons with empty teacher lists
            const teacherPairs = await this.getTeachersPairs(this.teachers, this.pairId);
            const newTeachers = Array<Array<Teacher>>(this.lessonNames.length);
            for (let i = 0; i < this.lessonNames.length; i++) {
                const lessonName = this.lessonNames[i];
                const matchingTeacherId = teacherPairs.findIndex(p => p.subjectName == lessonName);
                if (matchingTeacherId != -1) {
                    newTeachers[i] = this.teachers[matchingTeacherId];
                } else {
                    newTeachers[i] = [];
                }
            }
            this.teachers = newTeachers;
        }
    }

    private groupBy(xs: Array<any>, key: string) {
        const obj = xs.reduce(function (rv, x) {
            (rv[x[key]] = rv[x[key]] || []).push(x);
            return rv;
        }, {});
        return Object.keys(obj).map(k => obj[k]);
    };

    private async getTeachersLessonInfos(teachers: Teacher[][], pairId: PairIdentifier) {
        const pairs = await this.getTeachersPairs(teachers, pairId);
        return pairs.map(p => {
            const info = new LessonInfo();
            info.isOnline = p.isOnline;
            info.lessonType = p.lessonType;
            info.roomNumbers = [p.room];
            return info;
        });
    }

    private async getTeachersPairs(teachers: Teacher[][], pairId: PairIdentifier): Promise<TeacherPair[]> {
        return await Promise.all(teachers.flat().map(async t => {
            const teacherScheduleParser = new TeacherScheduleParser(t.scheduleUuid);
            await teacherScheduleParser.init();
            const teacherPair = teacherScheduleParser.parsePair(pairId);
            teacherPair.teacher = t;
            return teacherPair;
        }));
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

    private parseTeachers(cell: HTMLTableCellElement): Teacher[][] {
        const shortNames = Array.from(
            cell.querySelectorAll("a[href*=\"Schedules/ViewSchedule\"]"))
            .map(a => (<HTMLElement>a).innerHTML);
        const fullNames = Array.from(
            cell.querySelectorAll("a[href*=\"Schedules/ViewSchedule\"]"))
            .map(a => (<HTMLElement>a).title);
        const links = Array.from(
            cell.querySelectorAll("a[href*=\"Schedules/ViewSchedule\"]"))
            .map(a => (<HTMLLinkElement>a).href);

        const teachers: Teacher[][] = [];
        const scheduleLinkPrefix = "/Schedules/ViewSchedule.aspx?v=";
        for (let i = 0; i < shortNames.length; i++) {
            const teacher = new Teacher();
            teacher.shortName = shortNames[i];
            teacher.fullName = fullNames[i];
            teacher.scheduleUuid = links[i].substr(scheduleLinkPrefix.length);
            teachers.push([teacher]);
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

    // In practice, lessoninfo does not contain links only if it is online lesson
    private parsePlainInfo(lessonInfoStr: string): LessonInfo {
        const lessonInfo = new LessonInfo();
        lessonInfo.isOnline = lessonInfoStr.includes("on-line");
        lessonInfo.lessonType = lessonInfoStr.split(" ")[0];
        lessonInfo.roomNumbers = [];

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
        info.roomNumbers = [room];
        return info;
    }
}
