import { Day, Days } from "./day";

export class Schedule {
    firstWeek: Day[];
    secondWeek: Day[];
    uuid: string;

    constructor() {
        this.firstWeek = this.createWeek();
        this.secondWeek = this.createWeek();   
    }

    public isEmpty(): boolean {
        let firstWeekEmpty: boolean = this.weekIsEmpty(this.firstWeek);
        let secondWeekEmpty: boolean = this.weekIsEmpty(this.secondWeek);

        return firstWeekEmpty && secondWeekEmpty;
    }

    private weekIsEmpty(week: Day[]): boolean {
        let weekEmpty = true;

        daysLoop:
        for(let i = 0; i < 6; i++) {
            for(let j = 0; j < 6; j++) {
                if(week[i].pairs[j].lessons?.length ?? 0 > 0) {
                    weekEmpty = false;
                    break daysLoop;
                }
            }
        }

        return weekEmpty;
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
