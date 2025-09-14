export interface TerminalResult {
  success: boolean;
  message: string;
  data: Record<string, unknown>[];
}

export interface DatabaseConnection {
  host: string;
  port: number;
  database: string;
  username: string;
}

export interface ProblemDetails {
  description: string;
}

export interface SqlDialect {
  value: string;
  label: string;
}
