export interface ConnectionConfig {
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
    ssl?: boolean;
    options?: Record<string, any>;
  }
  
  export interface QueryResult {
    rows: any[];
    rowCount: number | null;
    fields?: Array<{
      name: string;
      dataTypeID: number;
    }>;
  }
  
  export interface DatabaseAdapter {
    connect(config: ConnectionConfig): Promise<void>;
    disconnect(): Promise<void>;
    isConnected(): boolean;
    query(sql: string, params?: any[]): Promise<QueryResult>;
    createTable(tableName: string, columns: Record<string, string>): Promise<void>;
    dropTable(tableName: string): Promise<void>;
    tableExists(tableName: string): Promise<boolean>;
  }