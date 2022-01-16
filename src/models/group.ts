import { Schedule } from "./schedule";

export class Group {
    name: string
    schedule: Schedule;

    constructor(name: string) {
        this.name = name;
    }
}