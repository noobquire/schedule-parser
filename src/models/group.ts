import { Schedule } from "./schedule";

export class Group {
    name: string
    schedule: Schedule;
    scheduleUuid: string;

    public getScheduleUrl() {
        return "http://rozklad.kpi.ua/Schedules/ViewSchedule.aspx?g=" + this.scheduleUuid;
    }

    constructor(name: string) {
        this.name = name;
    }
}