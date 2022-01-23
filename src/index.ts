import { ScheduleParser } from './scheduleParser';
import { writeFileSync } from 'fs';
import { JSDOM } from 'jsdom';
import { GroupSelectionParser } from './groupSelectionParser';
import { Group } from './models/group';
import { SchedulesDbClient } from './schedulesDb';
import { RozkladClient } from './rozkladClient';
import { Md5 } from 'ts-md5';

const ukrainianAlphabet = "абвгдеєжзиіїйклмнопрстуфхцчшщюя"; 
let validationToken: string;
let rozkladClient: RozkladClient;

(async () => {
    console.time("Parsing rozklad.kpi.ua");
    rozkladClient = new RozkladClient();
    validationToken = await getValidationToken();
    let groups: Group[] = [];

    for (let i = 0; i < ukrainianAlphabet.length; i++) {
        const firstLetter = ukrainianAlphabet[i];
        const groupNames = await rozkladClient.getGroupsList(firstLetter);

        // in very rare cases (ФФ-02ф) group name can appear several times 
        // with different case of letters (ФФ-02ф, ФФ-02Ф) and point to the same schedule page
        // so we just filter out case-insensitive duplicates
        const groupNamesWithoutDuplicates = groupNames.filter(distinctCaseInsensitive);

        for (const groupName of groupNamesWithoutDuplicates) {
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
    console.timeEnd("Parsing rozklad.kpi.ua");

    console.time("Inserting to schedules db");
    const client = new SchedulesDbClient();
    await client.insertSchedulesDatabase(groups);
    console.timeEnd("Inserting to schedules db");
})();

function distinctCaseInsensitive(value: string, index: number, self: string[]) {
    return self.map(s => s.toLowerCase()).indexOf(value.toLowerCase()) === index;
}

async function getGroupHashes(): Promise<Map<string, string>> {
    const client = new SchedulesDbClient();
    try {
        const hashes = await client.getGroupHashes();
        return hashes!;
    } finally {
        await client.end();
    }
}

async function getValidationToken(): Promise<string> {
    const groupSelectionHtml = await rozkladClient.getGroupScheduleSelectionPage();
    const document = new JSDOM(groupSelectionHtml).window.document;

    const parser = new GroupSelectionParser(document);

    return parser.getValidationToken();
}

function containsDuplicateNames(groups: Group[]): boolean {
    const valuesSoFar: string[] = [];
    for (let i = 0; i < groups.length; ++i) {
        const value: string = groups[i].name;
        if (valuesSoFar.indexOf(value) !== -1) {
            return true;
        }
        valuesSoFar.push(value);
    }
    return false;
}

async function getConflictingNamesGroupSchedules(groupName: string, groupSelectionParser: GroupSelectionParser): Promise<Group[]> {
    let groups = groupSelectionParser.parseGroupsList();

    console.warn(`Resolved ${groups.length} conflicting group names: ${groups.map(g => g.name).join(', ')}`)

    for (let i = 0; i < groups.length; i++) {
        const group = groups[i];
        console.log(`(${i + 1}/${groups.length}) Parsing schedule for group ${group.name}`);
        const groupPageHtml = await rozkladClient.getGroupScheduleByUuid(group.schedule.uuid);
        
        const groupDocument = new JSDOM(groupPageHtml).window.document;
        const scheduleParser = new ScheduleParser(groupDocument);
        const schedule = await scheduleParser.parse();
        const scheduleUuid = group.schedule.uuid;
        const scheduleHash = Md5.hashStr(JSON.stringify(schedule));
        schedule.uuid = scheduleUuid;
        schedule.hash = scheduleHash;
        group.schedule = schedule;
    }

    // due to inconsistent group naming, handle some rare cases:
    let nonEmptyGroups = groups.filter(g => !g.schedule.isEmpty());
    // if only one group has non-empty schedule
    if (nonEmptyGroups.length == 1) {
        console.log('Conflicting group names were duplicates, using non-empty schedule with default name');
        // use default group name without cathedra in brackets
        nonEmptyGroups[0].name = groupName;
    } // if all confliting groups have empty schedules
    else if (nonEmptyGroups.length == 0) {
        console.log('Conflicting group schedules were empty, using default name');
        // use only one default group name for empty groups list
        groups[0].name = groupName;
        nonEmptyGroups = [groups[0]];
    } // if several conflicting groups with same name have non-empty schedules
    else if (containsDuplicateNames(nonEmptyGroups)) {
        console.log('Conflicting group schedules had duplicate names, adding indexes to them');
        // concat indexes to their names to distinct them
        for (let i = 0; i < nonEmptyGroups.length; i++) {
            const group = nonEmptyGroups[i];
            group.name += ` #${i + 1}`;
        }
    }

    return nonEmptyGroups;
}

// returns all group schedules for groups with such name
async function getGroupSchedule(groupName: string): Promise<Group[]> {
    try {
        const groupScheduleResponse = await rozkladClient.getGroupScheduleByName(groupName, validationToken);

        if (groupScheduleResponse.status == 404) {
            console.warn(`Could not resolve schedule for group ${groupName}, skipping`);
            return [];
        }

        const document = new JSDOM(groupScheduleResponse.data).window.document;
        const groupSelectionParser = new GroupSelectionParser(document);

        // sometimes group is in groups list, but has no schedule (ІП-з91ф)
        // so we get group selection page with validation error
        if (groupSelectionParser.isGroupNotFoundPage()) {
            console.warn(`Could not resolve group ${groupName}, skipping`);
            // in this case, skip this group
            return [];
        }

        // if there are several groups with same name, we get group selection page
        if (groupSelectionParser.isGroupSelectionPage()) {
            return await getConflictingNamesGroupSchedules(groupName, groupSelectionParser);
        }

        const scheduleParser = new ScheduleParser(document);
        const schedule = await scheduleParser.parse();
        const scheduleHash = Md5.hashStr(JSON.stringify(schedule));
        schedule.hash = scheduleHash;

        const group = new Group(groupName);
        group.schedule = schedule;
        const groupScheduleLinkPrefix = "http://rozklad.kpi.ua/Schedules/ViewSchedule.aspx?g=";
        const responseLink: string = groupScheduleResponse.request.res.responseUrl!;
        group.schedule.uuid = responseLink.substr(groupScheduleLinkPrefix.length);

        return [group];

    } catch (error) {
        console.error(error);
        console.error((<Error>error).stack);
        return [];
    }
}
