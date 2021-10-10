import axios from 'axios';
import { GroupDetailsResponse } from './models/groupDetailsResponse';
import { GroupsResponse } from './models/groupsResponse';
import { Schedule } from './models/schedule';
import { ScheduleParser } from './scheduleParser';
import { writeFileSync } from 'fs';
import { JSDOM } from 'jsdom';

(async () => {
    console.time("parsing rozklad.kpi.ua");
    const groups = await getGroupsList();
    const schedules: Schedule[] = [];
    for (const group of groups) {
        console.log(`Parsing schedule for group ${group}`);
        const schedule = await getGroupSchedule(group);
        if (schedule !== undefined) {
            schedules.push(schedule);
        }
    }
    const jsonSchedulesData = JSON.stringify(schedules);
    writeFileSync("output.json", jsonSchedulesData);
    console.log("Wrote schedules to output.json");
    console.timeEnd("parsing rozklad.kpi.ua");
})()

async function getGroupsList(): Promise<string[]> {
    const groupsUrl = "http://rozklad.kpi.ua/Schedules/ScheduleGroupSelection.aspx/GetGroups";
    const response = await axios.post(groupsUrl, {
        prefixText: "І"
    });

    const groups = (<GroupsResponse><unknown>response.data).d;

    const groupRegex = /І[А-Я]-\d\d(?!ф)(мп|мн)?/; // daytime bachelor and master groups of FICT
    return groups.filter(g => groupRegex.test(g));
}

async function getGroupScheduleUrl(groupName: string): Promise<string> {
    const getScheduleUrl = "https://api.rozklad.org.ua/v2/groups/" + encodeURIComponent(groupName);

    const response = await axios.get<GroupDetailsResponse>(getScheduleUrl);
    return response.data.data.group_url;
}

async function getGroupSchedule(groupName: string): Promise<Schedule | undefined> {
    try {
        const scheduleUrl = await getGroupScheduleUrl(groupName);
        const document = (await JSDOM.fromURL(scheduleUrl)).window.document;
        const scheduleParser = new ScheduleParser(document);

        return scheduleParser.parseSchedulePage();
    } catch (error) {
        console.error(error);
        return;
    }
}
