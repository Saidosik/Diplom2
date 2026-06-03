export type ApiCollection<T> = {
    data: T[];
    links?: unknown;
    meta?: unknown;
};

export type ApiResource<T> = {
    data: T;
};