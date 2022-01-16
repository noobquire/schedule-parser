export interface Parser<T> {
    /**
     * Parse entity of specified type
     */
    parse(): Promise<T>;
}