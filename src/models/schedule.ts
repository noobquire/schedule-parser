import { Day, Days } from "./day";

export class Schedule {
    firstWeek: Day[];
    secondWeek: Day[];
    uuid: string;

    public isEmpty(): boolean {
        let firstWeekEmpty: boolean = this.weekIsEmpty(this.firstWeek);
        let secondWeekEmpty: boolean = this.weekIsEmpty(this.secondWeek);

        return firstWeekEmpty && secondWeekEmpty;
    }

    private weekIsEmpty(week: Day[]): boolean {
        let weekEmpty = true;

        daysLoop:
        for(const day of week) {
            for(const pair of day.pairs) {
                if(pair.lessons?.length ?? 0 > 0) {
                    weekEmpty = false;
                    break daysLoop;
                }
            }
        }

        return weekEmpty;
    }
}
