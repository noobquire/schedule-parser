import { Day, Days } from "./day";

export class Schedule {
    groupName: string;
    firstWeek: Day[];
    secondWeek: Day[];

    constructor(groupName: string) {
        this.firstWeek = this.createWeek();
        this.secondWeek = this.createWeek(); 
        this.groupName = groupName;      
    }

    private createWeek(): Day[] {
        const days: Day[] = [];

        for (let i = 0; i < 6; i++) {
            const day = new Day();
            day.dayNumber = i+1;
            day.dayName = Days[i]
            days.push(day);
        }

        return days;
    }
}
