import { Pair } from "./pair"

export class Day {
    dayNumber: Number
    dayName: string
    date: Date
    pairs: Pair[]

    constructor() {
        const pairs: Pair[] = [
            new Pair(1, new Date(0, 0, 0, 8, 30), new Date(0, 0, 0, 10, 5)),
            new Pair(2, new Date(0, 0, 0, 10, 25), new Date(0, 0, 0, 12, 0)),
            new Pair(3, new Date(0, 0, 0, 12, 20), new Date(0, 0, 0, 13, 55)),
            new Pair(4, new Date(0, 0, 0, 14, 15), new Date(0, 0, 0, 15, 50)),
            new Pair(5, new Date(0, 0, 0, 16, 10), new Date(0, 0, 0, 17, 45)),
            new Pair(6, new Date(0, 0, 0, 18, 30), new Date(0, 0, 0, 20, 5)),
        ];    
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
