import { RozkladClient } from "./rozkladClient";
import { JSDOM } from "jsdom";
import { TeacherPair } from "./models/teacherPair";
import { LessonInfo } from "./models/lessonInfo";
import { parseLessonType } from "./models/lesson";
import { PairIdentifier } from "./models/pairIdentifier";

export class TeacherScheduleParser {
    private teacherUuid: string;
    private document: Document;

    constructor(teacherScheduleUuid: string) {
        this.teacherUuid = teacherScheduleUuid;
    }
    
    public async init() {
        const client = new RozkladClient();
        do {
            const schedulePageHtml = await client.getTeacherScheduleByUuid(this.teacherUuid);
            const schedulePage = new JSDOM(schedulePageHtml).window.document;
            this.document = schedulePage;
        } while (this.isErrorPage(this.document));  
    }

    private isErrorPage(page: Document): boolean {
        return this.document
            .getElementsByTagName("body")[0].innerHTML
            .includes('Сторінка тимчасово недоступна');
    }

    // day and pair indexes are zero-based
    public parsePair(pairId: PairIdentifier): TeacherPair {
        const weekTableId = `ctl00_MainContent_${pairId.weekNumber == 1 ? "First" : "Second"}ScheduleTable`;
        const weekScheduleTable = <HTMLTableElement>this.document.getElementById(weekTableId);

        // teacher's schedule is empty?..
        if(weekScheduleTable == null) {
            // <br><h2>Сторінка тимчасово недоступна. </h2>
            // <br><h2>Вибачте за спричинені незручності. </h2>
            throw("Unable to parse teacher schedule");
        }

        const pairCell = weekScheduleTable.rows[pairId.pairIndex + 1].cells[pairId.dayIndex + 1];

        const pair = new TeacherPair();

        const subjectName = this.parseSubjectName(pairCell);
        const subjectFullName = this.parseFullSubjectName(pairCell);
        const lessonInfo = this.parseLessonInfo(pairCell);
        const groups = this.parseGroups(pairCell);

        pair.subjectName = subjectName;
        pair.subjectFullName = subjectName == subjectFullName ? undefined : subjectFullName;
        pair.lessonType = parseLessonType(lessonInfo.lessonType);
        pair.room = lessonInfo?.roomNumbers[0] ?? "";
        pair.isOnline = lessonInfo?.isOnline;

        return pair;
    }

    private parseGroups(pairCell: HTMLTableCellElement): string[] {
        // TODO: actual group parsing logic
        return [];
    }

    private parseSubjectName(pairCell: HTMLTableCellElement): string {
        const subjectName = pairCell.getElementsByClassName("disLabel")[0].children[0].innerHTML;
        return subjectName;
    }

    private parseFullSubjectName(pairCell: HTMLTableCellElement): string {
        const subjectLink = <HTMLLinkElement>pairCell.getElementsByClassName("disLabel")[0].children[0];
        const fullSubjectName = subjectLink.title;
        return fullSubjectName;
    }

    private parsePlainInfo(lessonInfoStr: string): LessonInfo {
        const lessonInfo = new LessonInfo();
        lessonInfo.isOnline = lessonInfoStr.includes("on-line");
        lessonInfo.lessonType = lessonInfoStr.split(" ")[0];
        lessonInfo.roomNumbers = [];

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
        info.roomNumbers = [room];
        return info;
    }

    private parseLessonInfo(pairCell: HTMLTableCellElement): LessonInfo {
        const lessonsInfoMatch = pairCell.innerHTML
            .match("(<\/a><br>|<br> |(?<!<\/span>)<br>)+(.+)$");

        const lessonInfoStr = lessonsInfoMatch![2]
            .split(/(?!\d), (?!\d)/) // room map coordinates can be two numbers separated by ', ', regex is to ignore that 
            .map(s => s.trim())[0];

        const lessonInfo = lessonInfoStr.includes("maps.google.com") ?
            this.parseLinkInfo(lessonInfoStr) :
            this.parsePlainInfo(lessonInfoStr);

        return lessonInfo;
    }
}