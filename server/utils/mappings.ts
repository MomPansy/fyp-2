export const SQL_TYPE_MAP = {
    "postgres": {
        "integer": "INTEGER",
        "number": "DOUBLE PRECISION",
        "string": "TEXT",
        "boolean": "BOOLEAN",
        "date": "DATE",
        "datetime": "TIMESTAMP WITHOUT TIME ZONE",
        "time": "TIME WITHOUT TIME ZONE",
        "yearmonth": "DATE", // could also use TEXT or custom domain
        "year": "SMALLINT",
        "duration": "INTERVAL",
    },
    "mysql": {
        "integer": "INT",
        "number": "DOUBLE",
        "string": "TEXT",
        "boolean": "TINYINT(1)",
        "date": "DATE",
        "datetime": "DATETIME",
        "time": "TIME",
        "yearmonth": "YEAR", // stores YYYY
        "year": "YEAR", // stores YYYY
        "duration": "BIGINT", // e.g. seconds; or store as VARCHAR
    },
    "sqlite": {
        "integer": "INTEGER",
        "number": "REAL",
        "string": "TEXT",
        "boolean": "INTEGER", // convention: 0/1
        "date": "TEXT", // ISO8601 strings
        "datetime": "TEXT",
        "time": "TEXT",
        "yearmonth": "TEXT",
        "year": "INTEGER",
        "duration": "TEXT", // e.g. ISO8601 duration
    },
    "sqlserver": {
        "integer": "INT",
        "number": "FLOAT",
        "string": "NVARCHAR(MAX)",
        "boolean": "BIT",
        "date": "DATE",
        "datetime": "DATETIME2",
        "time": "TIME",
        "yearmonth": "CHAR(7)", // e.g. 'YYYY-MM'
        "year": "SMALLINT",
        "duration": "TIME", // or store as BIGINT
    },
    "oracle": {
        "integer": "NUMBER(38)",
        "number": "FLOAT", // or NUMBER(p,s)
        "string": "CLOB",
        "boolean": "NUMBER(1)", // 0/1
        "date": "DATE",
        "datetime": "TIMESTAMP",
        "time": "TIMESTAMP", // Oracle has no pure TIME type
        "yearmonth": "VARCHAR2(7)", // e.g. 'YYYY-MM'
        "year": "NUMBER(4)",
        "duration": "INTERVAL DAY TO SECOND",
    },
};
