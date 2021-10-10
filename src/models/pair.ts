import { Lesson } from "./lesson"

export class Pair {
    pairNumber: Number
    pairStart: Date
    pairEnd: Date
    lessons: Lesson[]

    constructor(pairNumber: Number, pairStart: Date, pairEnd: Date) {
        this.pairNumber = pairNumber;
        this.pairStart = pairStart;
        this.pairEnd = pairEnd;        
    }
}
