import { Pair } from "./pair"

export class Day {
    dayNumber: Number
    dayName: string
    date: Date
    pairs: Pair[]

    constructor() {
        const pairs: Pair[] = [
            new Pair(1, "08:30", "10:05"),
            new Pair(2, "10:25", "12:00"),
            new Pair(3, "12:20", "13:55"),
            new Pair(4, "14:15", "15:50"),
            new Pair(5, "16:10", "17:45"),
            new Pair(6, "18:30", "20:05"),
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
