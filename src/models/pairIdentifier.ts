export class PairIdentifier {
    /**
     * Zero-based pair index, from 0 (1st pair) to 6 (7th pair)
     */
    public pairIndex: number;
    /**
     * Zero-based day index, from 0 (Monday) to 5 (Saturday)
     */
    public dayIndex: number;
    /**
     * One-based week number, 1 (first week) or 2 (second week)
     */
    public weekNumber: number;
    /**
     * One-based semester number, 1 (fall semester) or 2 (spring semester)
     */
    public semesterNumber: number;

    constructor(pairIndex: number, dayIndex: number, weekNumber: number, semesterNumber: number) {
        this.pairIndex = pairIndex;
        this.dayIndex = dayIndex;
        this.weekNumber = weekNumber;
        this.semesterNumber = semesterNumber;
    }

    public toString(): string {
        return `pair ${this.pairIndex+1}, day ${this.dayIndex+1}, week ${this.weekNumber}, semester ${this.semesterNumber}`;
    }
}