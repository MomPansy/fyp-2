export const problemKeys = {
    all: ["problems"] as const,
    detail: (id: string) => ["problems", id] as const,
};
