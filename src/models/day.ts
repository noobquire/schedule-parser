import { Pair } from "./pair"

export class Day {
    dayNumber: number
    dayName: string
    pairs: Pair[]

    constructor(dayNumber: number, pairs: Pair[]) {
        this.dayName = Days[dayNumber];
        this.pairs = pairs;
    }
}

const Days = [
    "Понеділок",
    "Вівторок",
    "Середа",
    "Четвер",
    "П'ятниця",
    "Субота"
]
export { Days };
