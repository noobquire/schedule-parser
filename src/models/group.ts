import { Schedule } from "./schedule";

export class Group {
    name: string
    schedule: Schedule;
    scheduleUrl: string;

    constructor(name: string) {
        this.name = name;
    }
}