import { Pool, QueryResult as PgQueryResult } from "pg";
import {
  ConnectionConfig,
  DatabaseAdapter,
  QueryResult,
} from "./AdapterInterface";

export class PostgresAdapter implements DatabaseAdapter {
  private pool: Pool | null = null;
  private connected = false;

  async connect(config: ConnectionConfig): Promise<void> {
    try {
      this.pool = new Pool({
        host: config.host,
        port: config.port,
        user: config.username,
        password: config.password,
        database: config.database,
        ssl: config.ssl,
        ...config.options,
      });
      const client = await this.pool.connect();
      client.release();
      this.connected = true;
    } catch (error) {
      this.connected = false;
      throw new Error(`Failed to connect to postgres: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.connected = false;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  async query(sql: string, params: any[] = []): Promise<QueryResult> {
    if (!this.pool) {
      throw new Error("Not connected to DB");
    }

    try {
      //   console.log('Executing SQL:', sql);
      //   console.log('With params:', params);
      const result: PgQueryResult = await this.pool.query(sql, params);

      return {
        rows: result.rows,
        rowCount: result.rowCount ?? 0,
        fields: result.fields?.map((field) => ({
          name: field.name,
          dataTypeID: field.dataTypeID,
        })),
      };
    } catch (error) {
      //   console.error('SQL Error:', error);
      throw new Error(`Query failed: ${error}`);
    }
  }


  async createTable(
    tableName: string,
    columns: Record<string, string>
  ): Promise<void> {
    const columnDefinitions = Object.entries(columns)
      .map(([name, type]) => `"${name}" ${type}`)
      .join(", ");

    const sql = `CREATE TABLE IF NOT EXISTS "${tableName}" (${columnDefinitions})`;
    await this.query(sql);
  }

  async dropTable(tableName: string): Promise<void> {
    await this.query(`DROP TABLE IF EXISTS "${tableName}"`);
  }

  async tableExists(tableName: string): Promise<boolean> {
    const result = await this.query(
      "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = $1 AND table_name = $2)",
      ["public", tableName]
    );
    return result.rows[0]?.exists || false;
  }
}
