import { Group } from "./models/group";
import { Client, Query } from 'ts-postgres';
import { v4 as uuidv4 } from 'uuid';
import { Teacher } from "./models/teacher";

export class SchedulesDbClient {

    private client: Client;

    constructor() {
        this.client = new Client({
            "database": "schedules",
            "password": "fictadvisor",
            "user": "postgres"
        });
        (async () => this.client.connect())();
    }

    public async end() {
        await this.client.end();
    }

    /**
     * Returns group's latest schedule page hash, or null, if group or schedules do not exist
     */
    public async getGroupHashes(): Promise<Map<string, string>| undefined> {
        try {

        
        const map = new Map<string,string>();
        
        const groupHashesQuery = new Query("select g.name as group_name, s.hash as schedule_hash from groups g " +
                                           "join group_schedules s " +
                                           "on s.group_id = g.id " +
                                           "where s.date_parsed = (select max(sc.date_parsed) from group_schedules sc " +
                                                                 "where sc.group_id = g.id " +
                                                                 "group by sc.group_id)");
        const groupHashes = await this.client.execute(groupHashesQuery);
        for(const row of groupHashes.rows) {
            const group_name = row[0]!.toString();
            const schedule_hash = row[1]?.toString() ?? "";
            map.set(group_name, schedule_hash);
        }
        return map;
        } catch(e) {
            console.error(e);
        }
    }

    public async insertSchedulesDatabase(groups: Group[]): Promise<void> {
        try {
            await this.insertGroups(groups);
            await this.insertSchedules(groups);
        } catch(error) {
            console.error(error);
        }
        finally {
            this.client.end();
        }
    }

    private async insertGroups(groups: Group[]): Promise<void> {
        for (const group of groups) {
            const existingGroupQuery = new Query(
                "SELECT name FROM groups WHERE name = $1",
                [group.name]
            );
            const existingGroup = await this.client.execute(existingGroupQuery);
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
            const result = await this.client.execute(query);
        }
    }

    private async getGroupUuid(groupName: string): Promise<string> {
        const existingGroupQuery = new Query(
            "SELECT id FROM groups WHERE name = $1",
            [groupName]
        );
        const group = await this.client.execute(existingGroupQuery);
        return group.rows[0][0]!.toString();
    }

    private async isUniqueScheduleHash(group: Group): Promise<boolean> {
        const existingGroupQuery = new Query(
            "SELECT hash FROM group_schedules WHERE rozklad_uuid = $1",
            [group.schedule.uuid]
        );
        const hash = await this.client.execute(existingGroupQuery);
        if(hash.rows.length == 0) {
            return true;
        }
        return hash.rows[0][0] == group.schedule.hash;
    }

    private async getOrCreateTeachers(teachers: Teacher[]): Promise<string[]> {
        const teacherUuids: string[] = [];
        for(const teacher of teachers) {
            if(teacher == null) {
                teacherUuids.push(""); // TODO: might regret this
            }
            const teacherId = await this.createTeacherIfNotExists(teacher);
            teacherUuids.push(teacherId);
        }
        return teacherUuids;
    }

    private async insertSchedules(groups: Group[]): Promise<void> {
        for (const group of groups) {
            if (!await this.isUniqueScheduleHash(group)) {
                console.log(`Schedule for group ${group.name} did not change, skipping`);
                continue;
            }
            const scheduleId = await this.insertSchedule(group);
            for (const day of group.schedule.firstWeek) {
                const dayName = day.dayName;
                for (const pair of day.pairs) {
                    const pairNumber = pair.pairNumber;
                    for (const lesson of pair.lessons) {
                        const teacherIds = await this.getOrCreateTeachers(lesson.teachers);
                        const id = uuidv4();
                        const insertLessonQuery = new Query(
                            "INSERT INTO lessons(id, subject_name, subject_full_name, teacher_ids, day, pair_number, type, schedule_id, is_online, rooms)" +
                            "VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
                            [
                                id,
                                lesson.subjectName,
                                lesson.subjectFullName ?? null,
                                teacherIds,
                                dayName,
                                pairNumber,
                                lesson.lessonType,
                                scheduleId,
                                lesson.isOnline,
                                lesson.rooms
                            ]
                        );
                        const result = await this.client.execute(insertLessonQuery);
                    }
                }
            }
        }
    }

    private async insertSchedule(group: Group): Promise<string> {
        const groupUuid = await this.getGroupUuid(group.name);
        const scheduleId = uuidv4();
        console.log(`Inserting schedule for group ${group.name} with uuid ${group.schedule.uuid}`);
        const insertScheduleQuery = new Query("INSERT INTO public.group_schedules(id, date_parsed, group_id, rozklad_uuid, hash)" +
            " VALUES ($1, current_timestamp, $2, $3, $4)",
            [scheduleId, groupUuid, group.schedule.uuid, group.schedule.hash]);
        const result = await this.client.execute(insertScheduleQuery);
        return scheduleId;
    }

    // returns teacher's id
    private async createTeacherIfNotExists(teacher: Teacher): Promise<string> {
        const existingTeacherId = await this.getTeacherUuid(teacher.shortName);
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
        const result = await this.client.execute(query);
        return id;
    }

    private async getTeacherUuid(shortName: string): Promise<string | null> {
        const existingGroupQuery = new Query(
            "SELECT id FROM teachers WHERE short_name = $1",
            [shortName]
        );
        const group = await this.client.execute(existingGroupQuery);
        if(group.rows == undefined || group.rows[0] == undefined || group.rows[0][0] == undefined) {
            return null;
        }
        return group.rows[0][0].toString();
    }
}
