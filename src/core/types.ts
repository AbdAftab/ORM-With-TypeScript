export type ColumnType = 'string' | 'number' | 'boolean' | 'date' | 'json' | 'array';

export interface ColumnDefinition {
  type: ColumnType;
  primary?: boolean;
  nullable?: boolean;
  unique?: boolean;
  default?: any;
  name?: string;
  references?: {
    table: string;
    column: string;
  };
}


export interface ModelMetadata {
  tableName: string;
  columns: Record<string, ColumnDefinition>;
}

export interface ModelConstructor<T> {
  new (...args: any[]): T;
  metadata: ModelMetadata;
}