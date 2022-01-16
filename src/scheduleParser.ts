import { Day } from "./models/day";
import { Pair } from "./models/pair";
import { PairIdentifier } from "./models/pairIdentifier";
import { Schedule } from "./models/schedule";
import { PairParser } from "./parsers/pairParser";

export class ScheduleParser {

    private document: Document;

    constructor(document: Document) {
        this.document = document;
    }

    private isDaytimeSchedule(scheduleTable: HTMLTableElement): boolean {
        // fulltime group schedule must have
        // 7 or 8 rows (6-7 pairs and one row for day names)
        // 7 columns (6 days and one column for pair time)
        const rows = scheduleTable.rows.length;
        const columns = scheduleTable.rows[0]?.cells.length ?? 0;
        if (![7, 8].includes(rows) || columns != 7) {
            console.warn(`Received unexpected schedule table size: ${rows} rows, ${columns} columns`);
            return false;
        }

        return true;
    }

    public async parseSchedulePage(): Promise<Schedule> {
        const schedule = new Schedule();

        const firstWeekScheduleTable = <HTMLTableElement>this.document
            .getElementById("ctl00_MainContent_FirstScheduleTable");
        if (!this.isDaytimeSchedule(firstWeekScheduleTable)) {
            return schedule;
        }
        const firstWeek = await this.parseWeekFromTable(firstWeekScheduleTable!, 1);
        const secondWeekScheduleTable = <HTMLTableElement>this.document
            .getElementById("ctl00_MainContent_SecondScheduleTable");
        const secondWeek = await this.parseWeekFromTable(secondWeekScheduleTable!, 2);
        
        schedule.firstWeek = firstWeek;
        schedule.secondWeek = secondWeek;

        return schedule;
    }

    private async parseWeekFromTable(scheduleTable: HTMLTableElement, weekNumber: number): Promise<Day[]> {
        const week: Day[] = [];

        for (let dayId = 0; dayId < 6; dayId++) {
            const dayPairs: Pair[] = [];
            for (let pairId = 0; pairId < 6; pairId++) {
                const scheduleCell = scheduleTable.rows[pairId + 1].cells[dayId + 1];
                const pairIdentifier = new PairIdentifier(pairId, dayId, weekNumber, 1);
                const pairParser = new PairParser(scheduleCell, pairIdentifier);
                const pair = await pairParser.parse();
                dayPairs.push(pair);
            }
            const day = new Day(dayId+1, dayPairs);
            week.push(day);
        }

        return week;
    }
}
