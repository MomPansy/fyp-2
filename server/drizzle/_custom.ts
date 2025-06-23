import { customType } from 'drizzle-orm/pg-core';

export const citext = customType<{
    data: string; 
    notNull: true;
    default: false; 
}>({
    dataType() {
        return 'citext';
    }
});
