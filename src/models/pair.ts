import { Lesson } from "./lesson"

export class Pair {
    pairNumber: number
    pairStart: string
    pairEnd: string
    lessons: Lesson[]

    constructor(pairNumber: number, pairStart: string, pairEnd: string) {
        this.pairNumber = pairNumber;
        this.pairStart = pairStart;
        this.pairEnd = pairEnd;        
    }
}
