import { Day } from "./day";
import { Schedule } from "./schedule";
import { Teacher } from "./teacher";

export class Group {
    name: string
    schedule: Schedule;

    public getScheduleUrl() {
        return "http://rozklad.kpi.ua/Schedules/ViewSchedule.aspx?g=" + this.schedule.uuid;
    }

    constructor(name: string) {
        this.name = name;
    }
}