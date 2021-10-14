import { Day, Days } from "./day";

export class Schedule {
    firstWeek: Day[];
    secondWeek: Day[];

    constructor() {
        this.firstWeek = this.createWeek();
        this.secondWeek = this.createWeek();   
    }

    public isEmpty(): boolean {
        let firstWeekEmpty: boolean = true;
        let secondWeekEmpty: boolean = true;

        daysLoop:
        for(let i = 0; i < 6; i++) {
            for(let j = 0; j < 6; j++) {
                if(this.firstWeek[i].pairs[j].lessons?.length ?? 0 > 0) {
                    firstWeekEmpty = false;
                    break daysLoop;
                }
            }
        }

        daysLoop:
        for(let i = 0; i < 6; i++) {
            for(let j = 0; j < 6; j++) {
                if(this.secondWeek[i].pairs[j].lessons?.length ?? 0 > 0) {
                    secondWeekEmpty = false;
                    break daysLoop;
                }
            }
        }

        return firstWeekEmpty && secondWeekEmpty;
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
