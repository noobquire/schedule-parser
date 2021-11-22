import { Group } from "./models/group";
import { Client, Query } from 'ts-postgres';
import { v4 as uuidv4 } from 'uuid';
import { Teacher } from "./models/teacher";

export async function insertSchedulesDatabase(groups: Group[]): Promise<void> {
    const client = new Client({
        "database": "schedules",
        "password": "fictadvisor",
        "user": "postgres"
    });
    await client.connect();

    try {
        await insertGroups(client, groups);
        await insertSchedules(client, groups);
    } finally {
        client.end();
    }
}

async function insertGroups(client: Client, groups: Group[]): Promise<void> {
    for (const group of groups) {
        const existingGroupQuery = new Query(
            "SELECT name FROM groups WHERE name = $1",
            [group.name]
        );
        const existingGroup = await client.execute(existingGroupQuery);
        if (existingGroup.rows.length > 0) {
            console.log(`Group ${group.name} already exists, skipping`);
            continue;
        }

        console.log(`Inserting group ${group.name}`);
        const id = uuidv4();
        const query = new Query(
            "INSERT INTO groups(id, name) VALUES ($1, $2)",
            [id, group.name]
        );
        const result = await client.execute(query);
    }
}

async function getGroupUuid(client: Client, groupName: string): Promise<string> {
    const existingGroupQuery = new Query(
        "SELECT id FROM groups WHERE name = $1",
        [groupName]
    );
    const group = await client.execute(existingGroupQuery);
    return group.rows[0][0]!.toString();
}

async function isUniqueScheduleUuid(client: Client, scheduleUuid: string): Promise<boolean> {
    const existingGroupQuery = new Query(
        "SELECT id FROM group_schedules WHERE rozklad_uuid = $1",
        [scheduleUuid]
    );
    const group = await client.execute(existingGroupQuery);
    return group.rows.length == 0;
}

async function insertSchedules(client: Client, groups: Group[]): Promise<void> {
    for (const group of groups) {
        if(!await isUniqueScheduleUuid(client, group.schedule.uuid)) {
            console.log(`Schedule for group ${group.name} did not change, skipping`);
            continue;
        }
        const scheduleId = await insertSchedule(client, group);
        for (const day of group.schedule.firstWeek) {
            const dayName = day.dayName;
            for (const pair of day.pairs) {
                const pairNumber = pair.pairNumber;
                for (const lesson of pair.lessons) {
                    const teacherId = lesson.teacher == null ? null : await createTeacherIfNotExists(client, lesson.teacher);
                    const id = uuidv4();
                    const insertLessonQuery = new Query(
                        "INSERT INTO lessons(id, subject_name, subject_full_name, teacher_id, day, pair_number, type, schedule_id, is_online, room)" +
                        "VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
                        [
                            id,
                            lesson.subjectName,
                            lesson.subjectFullName ?? null,
                            teacherId,
                            dayName,
                            pairNumber,
                            lesson.lessonType,
                            scheduleId,
                            lesson.isOnline,
                            lesson.room
                        ]
                    );
                    const result = await client.execute(insertLessonQuery);
                }
            }
        }
    }
}

async function insertSchedule(client: Client, group: Group): Promise<string> {
    const groupUuid = await getGroupUuid(client, group.name);
    const scheduleId = uuidv4();
    console.log(`Inserting schedule for group ${group.name} with uuid ${group.schedule.uuid}`);
    const insertScheduleQuery = new Query("INSERT INTO public.group_schedules(id, date_parsed, group_id, rozklad_uuid)" +
        " VALUES ($1, current_timestamp, $2, $3)",
        [scheduleId, groupUuid, group.schedule.uuid]);
    const result = await client.execute(insertScheduleQuery);
    return scheduleId;
}

// returns teacher's id
async function createTeacherIfNotExists(client: Client, teacher: Teacher): Promise<string> {
    const existingTeacherId = await getTeacherUuid(client, teacher.shortName);
    if (existingTeacherId != null) {
        return existingTeacherId;
    }

    console.log(`Inserting teacher ${teacher.shortName}`);
    const id = uuidv4();
    const query = new Query(
        "INSERT INTO teachers(id, full_name, short_name, schedule_id) VALUES ($1, $2, $3, $4)",
        [id,
            teacher.fullName,
            teacher.shortName,
            teacher.scheduleUuid]
    );
    const result = await client.execute(query);
    return id;
}

async function getTeacherUuid(client: Client, shortName: string): Promise<string | null> {
    const existingGroupQuery = new Query(
        "SELECT id FROM teachers WHERE short_name = $1",
        [shortName]
    );
    const group = await client.execute(existingGroupQuery);
    if(group.rows == undefined || group.rows[0] == undefined || group.rows[0][0] == undefined) {
        return null;
    }
    return group.rows[0][0].toString();
}
