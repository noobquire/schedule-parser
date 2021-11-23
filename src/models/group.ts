import { Day } from "./day";
import { Schedule } from "./schedule";
import { Teacher } from "./teacher";

export class Group {
    name: string
    schedule: Schedule;

    constructor(name: string) {
        this.name = name;
    }
}