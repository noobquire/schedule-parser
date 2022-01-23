import { GroupPair } from "./groupPair"

export class Day {
    dayNumber: number
    dayName: string
    pairs: GroupPair[]

    constructor(dayNumber: number, pairs: GroupPair[]) {
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
