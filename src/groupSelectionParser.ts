import { Group } from "./models/group";
import { GroupSchedule } from "./models/groupSchedule";

export class GroupSelectionParser {
    private document: Document;

    constructor(document: Document) {
        this.document = document;
    }

    public isGroupNotFoundPage(): boolean {
        const error = this.document.getElementById("ctl00_MainContent_ctl00_lblError");

        return error?.innerHTML == 'Групи з такою назвою не знайдено!';
    }

    public isGroupSelectionPage(): boolean {
        const groupsList = this.document.getElementById("ctl00_MainContent_ctl00_GroupListPanel");

        return !this.isGroupNotFoundPage() && groupsList !== null;
    }

    public getValidationToken(): string {
        const eventValidation = <HTMLInputElement>this.document.getElementById("__EVENTVALIDATION");

        return eventValidation.value;
    }

    public parseGroupsList(): Group[] {
        const groupLinks = <NodeList>this.document.getElementById("ctl00_MainContent_ctl00_GroupListPanel")?.querySelectorAll("a");
        const scheduleLinkPrefix = "ViewSchedule.aspx?g=";
        const groups: Group[] = Array.from(groupLinks).map(groupElement => {
            const groupLink = <HTMLLinkElement>groupElement;
            const group = new Group(groupLink.innerHTML);
            group.schedule = new GroupSchedule();
            group.schedule.uuid = groupLink.href.substr(scheduleLinkPrefix.length);
            return group;
        });

        return groups;
    }
}
