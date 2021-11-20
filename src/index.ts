import axios, { AxiosResponse } from 'axios';
import { GroupsResponse } from './models/groupsResponse';
import { ScheduleParser } from './scheduleParser';
import { writeFileSync } from 'fs';
import { JSDOM } from 'jsdom';
import { GroupSelectionParser } from './groupSelectionParser';
import { Group } from './models/group';

const getScheduleUrl = "http://rozklad.kpi.ua/Schedules/ScheduleGroupSelection.aspx";
const ukrainianAlphabet = "абвгдеєжзиіїйклмнопрстуфхцчшщюя"; //"і";
let validationToken: string;

(async () => {
    console.time("parsing rozklad.kpi.ua");
    validationToken = await getValidationToken();
    let groups: Group[] = [];

    for (let i = 0; i < ukrainianAlphabet.length; i++) {
        const firstLetter = ukrainianAlphabet[i];
        const groupNames = await getGroupsList(firstLetter);

        for (const groupName of groupNames) {
            console.log(`Parsing schedule for group ${groupName}`);
            const parsedGroups = await getGroupSchedule(groupName);
            groups.push(...parsedGroups!);
        }
    }

    const emptyGroupNames = groups.filter(g => g.schedule.isEmpty()).map(g => g.name);
    groups = groups.filter(g => !g.schedule.isEmpty());
    console.log(`Filtered ${emptyGroupNames.length} empty schedules`);
    const jsonSchedulesData = JSON.stringify(groups);
    writeFileSync("schedules.json", jsonSchedulesData);
    console.log(`Wrote ${groups.length} schedules to schedules.json`);
    writeFileSync("empty-groups.json", JSON.stringify(emptyGroupNames));
    console.log(`Wrote names of groups with empty schedules to empty-groups.json`);
    console.timeEnd("parsing rozklad.kpi.ua");
})();

async function getGroupsList(firstLetter: string): Promise<string[]> {
    const groupsUrl = getScheduleUrl + "/GetGroups";
    const response = await axios.post(groupsUrl, {
        prefixText: firstLetter
    });

    const groups = (<GroupsResponse><unknown>response.data).d ?? [];

    return groups;
    //const groupRegex = /І[А-Я]-\d\d(?!ф)(мп|мн)?/; // daytime bachelor and master groups of FICT
    //return groups.filter(g => groupRegex.test(g));
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
        if (pageResponse.status == 404) {

            return [];
        }

        const document = new JSDOM(pageResponse.data).window.document;
        const groupSelectionParser = new GroupSelectionParser(document);

        if (groupSelectionParser.isGroupSelectionPage()) {
            let groups = groupSelectionParser.parseGroupsList();

            if (groups.length == 0) {
                console.warn(`Could not resolve group ${groupName}, skipping`);
                return groups;
            }

            console.warn(`Resolved ${groups.length} conflicting group names: ${groups.map(g => g.name).join(', ')}`)

            for (let i = 0; i < groups.length; i++) {
                const group = groups[i];
                console.log(`(${i + 1}/${groups.length}) Parsing schedule for group ${group.name}`);
                const groupPageHtml = await axios.get<string>(group.scheduleUrl);
                const groupDocument = new JSDOM(groupPageHtml.data).window.document;
                const scheduleParser = new ScheduleParser(groupDocument);
                const schedule = scheduleParser.parseSchedulePage();
                group.schedule = schedule;
            }

            const nonEmptyGroups = groups.filter(g => !g.schedule.isEmpty());
            if (nonEmptyGroups.length == 1) { // if conflicting groups have duplicates
                console.log(`Conflicting group names were duplicates, using non-empty schedule with default name`);
                nonEmptyGroups[0].name = groupName; // use default group name without cathedra
                groups = nonEmptyGroups;
            } else if (nonEmptyGroups.length == 0) {
                console.log(`Conflicting group schedules were empty, using default name`);
                groups[0].name = groupName; // use only one default group name
                groups = [groups[0]];
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
        console.error((<Error>error).stack);
        return [];
    }
}
