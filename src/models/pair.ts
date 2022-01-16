import { Lesson } from "./lesson"

export class Pair {
    pairNumber: number
    pairStart: string
    pairEnd: string
    lessons: Lesson[]

    constructor(pairNumber: number, lessons: Lesson[]) {
        this.pairNumber = pairNumber;
        this.setStartAndEnd();
        this.lessons = lessons;
    }

    private setStartAndEnd() {
        switch (this.pairNumber) {
            case 1:
                this.pairStart = "08:30";
                this.pairEnd = "10:05";
                break;
            case 2:
                this.pairStart = "10:25";
                this.pairEnd = "12:00";
                break;
            case 3:
                this.pairStart = "12:20";
                this.pairEnd = "13:55";
                break;
            case 4:
                this.pairStart = "14:15";
                this.pairEnd = "15:50";
                break;
            case 5:
                this.pairStart = "16:10";
                this.pairEnd = "17:45";
                break;
            case 6:
                this.pairStart = "18:30";
                this.pairEnd = "20:05";
                break;
        }     
    }
}
