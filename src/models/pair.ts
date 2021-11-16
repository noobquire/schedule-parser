import { Lesson } from "./lesson"

export class Pair {
    pairNumber: Number
    pairStart: string
    pairEnd: string
    lessons: Lesson[]

    constructor(pairNumber: Number, pairStart: string, pairEnd: string) {
        this.pairNumber = pairNumber;
        this.pairStart = pairStart;
        this.pairEnd = pairEnd;        
    }
}
