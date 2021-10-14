import { Group } from "./models/group";

export class GroupSelectionParser {
    private document: Document;

    constructor(document: Document) {
        this.document = document;
    }

    public isGroupSelectionPage(): boolean {
        const groupsList = this.document.getElementById("ctl00_MainContent_ctl00_GroupListPanel");

        return groupsList !== null;
    }

    public getValidationToken(): string {
        const eventValidation = <HTMLInputElement>this.document.getElementById("__EVENTVALIDATION");

        return eventValidation.value;
    }

    public parseGroupsList(): Group[] {
        const groupLinks = <NodeList>this.document.getElementById("ctl00_MainContent_ctl00_GroupListPanel")?.querySelectorAll("a");
        const groups: Group[] = Array.from(groupLinks).map(groupElement => {
            const groupLink = <HTMLLinkElement>groupElement;
            const group = new Group(groupLink.innerHTML);
            group.scheduleUrl = "http://rozklad.kpi.ua/Schedules/" + groupLink.href;
            return group;
        });

        return groups;
    }
}
