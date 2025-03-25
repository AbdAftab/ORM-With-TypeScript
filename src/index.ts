// core
export {Model} from './core/Model';
export { Repository } from './core/Repository';
export { QueryBuilder } from './core/QueryBuilder';
export { Connection, createConnection } from './core/Connection';
export * from './core/types';
// adapter
export { DatabaseAdapter, ConnectionConfig, QueryResult } from './adapters/AdapterInterface';
export { PostgresAdapter } from './adapters/PostgresAdapter';
// decorator
export { Entity, Column, PrimaryKey, PrimaryGeneratedColumn, ForeignKey } from './decorators';
import 'reflect-metadata';
// TODO: Transactions, Migrations.