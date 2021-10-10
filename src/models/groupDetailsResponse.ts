export interface GroupDetailsResponseData {
    group_id: number;
    group_full_name: string;
    group_prefix: string;
    group_okr: string;
    group_type: string;
    group_url: string;
}

export interface GroupDetailsResponse {
    statusCode: number;
    timeStamp: number;
    message: string;
    debugInfo?: any;
    meta?: any;
    data: GroupDetailsResponseData;
}
