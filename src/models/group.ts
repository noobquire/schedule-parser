import { GroupSchedule } from "./groupSchedule";

export class Group {
    name: string
    schedule: GroupSchedule;

    constructor(name: string) {
        this.name = name;
    }
}