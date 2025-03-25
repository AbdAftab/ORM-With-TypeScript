import { ConnectionConfig, DatabaseAdapter } from '../adapters/AdapterInterface';
import { PostgresAdapter } from '../adapters/PostgresAdapter';
import {Repository} from './Repository';
import {Model} from './Model';
import {ModelConstructor} from './types';

export class Connection {
  private adapter: DatabaseAdapter;
  private repositories: Map<string, Repository<any>> = new Map();
  private config: ConnectionConfig;
  private modelRegistry: Map<string, ModelConstructor<any>> = new Map();
  
  constructor(adapter: DatabaseAdapter, config: ConnectionConfig) {
    this.adapter = adapter;
    this.config = config;
  }
  
  async connect(): Promise<void> {
    await this.adapter.connect(this.config);
  }
  
  async disconnect(): Promise<void> {
    await this.adapter.disconnect();
  }
  
  isConnected(): boolean {
    return this.adapter.isConnected();
  }
  registerModel<T extends Model>(modelClass: ModelConstructor<T>): void {
    // console.log("MODEL METADATA???????????????????:", modelClass.metadata.columns['userId'])
    if (!modelClass.metadata) {
      throw new Error(`Model ${modelClass.name} has no metadata.`);
    }
    
    this.modelRegistry.set(modelClass.name, modelClass);
  }

  getRepository<T extends Model>(modelClass: ModelConstructor<T>): Repository<T> {
    const modelName = modelClass.name;

    if (this.repositories.has(modelName)) {
      return this.repositories.get(modelName) as Repository<T>;
    }

    const repository = new Repository<T>(modelClass, this.adapter);
    this.repositories.set(modelName, repository);
    
    return repository;
  }

  getAdapter(): DatabaseAdapter {
    return this.adapter;
  }
}
export async function createConnection(config: ConnectionConfig, adapterType: string = 'postgres'): Promise<Connection> {
  let adapter: DatabaseAdapter;

  switch (adapterType.toLowerCase()) {
    case 'postgres':
      adapter = new PostgresAdapter();
      break;
    default:
      throw new Error(`adapter type not supported: ${adapterType}`);
  }
  const connection = new Connection(adapter, config);
  await connection.connect();
  
  return connection;
}