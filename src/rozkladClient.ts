import axios, { AxiosInstance, AxiosResponse } from "axios";
import { GroupsResponse } from "./models/groupsResponse";

export class RozkladClient {
    private client: AxiosInstance;

    constructor() {
        this.client = axios.create({
            baseURL: "http://rozklad.kpi.ua/Schedules"
        });
    }

    public async getGroupsList(prefix: string): Promise<string[]> {
        const response = await this.client.post<any, AxiosResponse<GroupsResponse>>("/ScheduleGroupSelection.aspx/GetGroups", {
            prefixText: prefix
        });

        if (response.status != 200) {
            throw ("Error getting group names from rozklad.kpi.ua");
        }

        const groups = response.data.d ?? [];

        return groups;
    }

    public async getGroupScheduleSelectionPage(): Promise<string> {
        const response = await this.client.get<string>("/ScheduleGroupSelection.aspx");
        if (response.status != 200) {
            throw ("Error getting group names from rozklad.kpi.ua");
        }
        return response.data;
    }

    public async getGroupScheduleByName(groupName: string, validationToken: string): Promise<AxiosResponse<string>> {
        const query = new URLSearchParams();
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

        // form POST gets redirected to schedule GET
        const response = await this.client.post<any, AxiosResponse<string>>("/ScheduleGroupSelection.aspx", queryString, config);

        return response;
    }

    public async getGroupScheduleByUuid(groupScheduleUuid: string): Promise<string> {
        const scheduleUri = "/ViewSchedule.aspx?g=" + groupScheduleUuid;
        const response = await this.client.get<string>(scheduleUri);
        return response.data;
    }

    public async getTeacherScheduleByUuid(teacherScheduleUuid: string): Promise<string> {
        const scheduleUri = "/ViewSchedule.aspx?v=" + teacherScheduleUuid;
        const response = await this.client.get<string>(scheduleUri, { timeout: 60000 });
        return response.data;
    }
}
