import axios from 'axios';
import { GroupsResponse } from './models/groupsResponse';
import { Schedule } from './models/schedule';
import { ScheduleParser } from './scheduleParser';
import { writeFileSync } from 'fs';
import { JSDOM } from 'jsdom';

const getScheduleUrl = "http://rozklad.kpi.ua/Schedules/ScheduleGroupSelection.aspx";
const ukrainianAlphabet = "абвгдеєжзиіїйклмнопрстуфхцчшщюя";
let validationToken: string;

(async () => {
    console.time("parsing rozklad.kpi.ua");
    validationToken = await getValidationToken();
    const groups = await getGroupsList();
    const schedules: Schedule[] = [];
    for (const group of groups) {
        console.log(`Parsing schedule for group ${group}`);
        const schedule = await getGroupSchedule(group);
        if (schedule !== undefined) {
            schedules.push(schedule);
        }
    }

    Date.prototype.toJSON = function(){
        const hoursDiff = this.getHours() - this.getTimezoneOffset() / 60;
        this.setHours(hoursDiff);
        return this.toISOString();
    };

    const jsonSchedulesData = JSON.stringify(schedules);
    writeFileSync("output.json", jsonSchedulesData);
    console.log("Wrote schedules to output.json");
    console.timeEnd("parsing rozklad.kpi.ua");
})()

async function getGroupsList(): Promise<string[]> {
    const groupsUrl = getScheduleUrl + "/GetGroups";
    const response = await axios.post(groupsUrl, {
        prefixText: "І"
    });

    const groups = (<GroupsResponse><unknown>response.data).d;

    const groupRegex = /І[А-Я]-\d\d(?!ф)(мп|мн)?/; // daytime bachelor and master groups of FICT
    return groups.filter(g => groupRegex.test(g));
}

async function getValidationToken(): Promise<string> {
    const responseHtml = await axios.get<string>(getScheduleUrl);
    const document = new JSDOM(responseHtml.data).window.document;
    
    const eventValidation = <HTMLInputElement>document.getElementById("__EVENTVALIDATION");
    
    return eventValidation.value;
}

async function getGroupScheduleHtml(groupName: string): Promise<string> {
    const query = new URLSearchParams();
    query.append("__EVENTARGUMENT", "");
    query.append("__EVENTTARGET", "");
    query.append("__EVENTVALIDATION", validationToken);
    query.append("ctl00$MainContent$ctl00$btnShowSchedule", "Розклад занять");
    query.append("ctl00$MainContent$ctl00$txtboxGroup", groupName);
    const queryString = query.toString();

    const config = {
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        }
    };

    const response = await axios.post(getScheduleUrl, queryString, config);
    return <string><unknown>response.data;
}

async function getGroupSchedule(groupName: string): Promise<Schedule | undefined> {
    try {
        const scheduleHtml = await getGroupScheduleHtml(groupName);
        const document = new JSDOM(scheduleHtml).window.document;
        // TODO: Check if we got schedule page or group list page
        const scheduleParser = new ScheduleParser(document);

        return scheduleParser.parseSchedulePage();
    } catch (error) {
        console.error(error);
        return;
    }
}
