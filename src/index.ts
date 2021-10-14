import axios, { AxiosResponse } from 'axios';
import { GroupsResponse } from './models/groupsResponse';
import { Schedule } from './models/schedule';
import { ScheduleParser } from './scheduleParser';
import { writeFileSync } from 'fs';
import { JSDOM } from 'jsdom';
import { GroupSelectionParser } from './groupSelectionParser';
import { Group } from './models/group';

const getScheduleUrl = "http://rozklad.kpi.ua/Schedules/ScheduleGroupSelection.aspx";
const ukrainianAlphabet = "абвгдеєжзиіїйклмнопрстуфхцчшщюя";
let validationToken: string;

(async () => {
    console.time("parsing rozklad.kpi.ua");
    validationToken = await getValidationToken();
    const groupNames = await getGroupsList();
    const groups: Group[] = [];
    for (const groupName of groupNames) {
        console.log(`Parsing schedule for group ${groupName}`);

        const parsedGroups = await getGroupSchedule(groupName);
        groups.push(...parsedGroups!);
    }

    Date.prototype.toJSON = function () {
        const hoursDiff = this.getHours() - this.getTimezoneOffset() / 60;
        this.setHours(hoursDiff);
        return this.toISOString();
    };

    const jsonSchedulesData = JSON.stringify(groups);
    writeFileSync("output.json", jsonSchedulesData);
    console.log("Wrote schedules to output.json");
    console.timeEnd("parsing rozklad.kpi.ua");
})();

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

    const parser = new GroupSelectionParser(document);

    return parser.getValidationToken();
}

async function getGroupScheduleResponse(groupName: string): Promise<AxiosResponse<string>> {
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
    return response;
}

async function getGroupSchedule(groupName: string): Promise<Group[]> {
    try {
        const pageResponse = await getGroupScheduleResponse(groupName);
        const document = new JSDOM(pageResponse.data).window.document;
        const groupSelectionParser = new GroupSelectionParser(document);

        if (groupSelectionParser.isGroupSelectionPage()) {
            const groups = groupSelectionParser.parseGroupsList();
            console.warn(`Resolved ${groups.length} conflicting group names: ${groups.map(g => g.name).join(', ')}`)
            for (const group of groups) {
                const groupPageHtml = await axios.get<string>(group.scheduleUrl);
                const groupDocument = new JSDOM(groupPageHtml.data).window.document;
                const scheduleParser = new ScheduleParser(groupDocument);
                const schedule = scheduleParser.parseSchedulePage();
                group.schedule = schedule;
            }
            return groups;
        }

        const scheduleParser = new ScheduleParser(document);
        const schedule = scheduleParser.parseSchedulePage();
        const group = new Group(groupName);
        group.schedule = schedule;
        group.scheduleUrl = pageResponse.request.res.responseUrl!;
        return [group];

    } catch (error) {
        console.error(error);
        return [];
    }
}
