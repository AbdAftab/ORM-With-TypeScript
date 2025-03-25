import { DatabaseAdapter } from '../adapters/AdapterInterface';
import { Model } from './Model';
import { ModelConstructor } from './types';
import { QueryBuilder } from './QueryBuilder';

export class Repository<T extends Model> {
  private modelClass: ModelConstructor<T>;
  private adapter: DatabaseAdapter;
  private queryBuilder: QueryBuilder;
  
  constructor(modelClass: ModelConstructor<T>, adapter: DatabaseAdapter) {
    this.modelClass = modelClass;
    this.adapter = adapter;
    this.queryBuilder = new QueryBuilder(modelClass.metadata);
  }
  
  async findAll(conditions?: Record<string, any>): Promise<T[]> {
    let query = this.queryBuilder.select();
    
    if (conditions) {
      query = this.queryBuilder.where(conditions);
    }
    
    const { sql, params } = query.build();
    const result = await this.adapter.query(sql, params);
    
    return result.rows.map(row => new this.modelClass(row));
  }
  
  async findOne(conditions: Record<string, any>): Promise<T | null> {
    const query = this.queryBuilder
      .select()
      .where(conditions)
      .limit(1)
      .build();
    
    const result = await this.adapter.query(query.sql, query.params);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return new this.modelClass(result.rows[0]);
  }
  
  async findById(id: string | number): Promise<T | null> {
    const primaryKeyColumn = Object.entries(this.modelClass.metadata.columns)
      .find(([_, def]) => def.primary)?.[0];
    
    if (!primaryKeyColumn) {
      throw new Error(`No primary key defined for ${this.modelClass.metadata.tableName}`);
    }
    
    return this.findOne({ [primaryKeyColumn]: id });
  }
  
  async create(entity: T): Promise<T> {
    const query = this.queryBuilder
      .insert(entity)
      .build();
    
    const result = await this.adapter.query(query.sql, query.params);
    if (result.rows.length > 0) {
      Object.assign(entity, result.rows[0]);
    }
    
    entity.syncOriginalValues();
    return entity;
  }
  
  async update(entity: T): Promise<T> {
    if (!entity.hasChanges()) {
      return entity;
    }
    const primaryKeyColumn = Object.entries(this.modelClass.metadata.columns)
      .find(([_, def]) => def.primary)?.[0];
      
    if (!primaryKeyColumn) {
      throw new Error(`No primary key defined for ${this.modelClass.metadata.tableName}`);
    }
    
    const primaryKeyValue = entity[primaryKeyColumn as keyof T];
    if (primaryKeyValue === undefined) {
      throw new Error('Cannot update entity without primary key value');
    }
    
    const query = this.queryBuilder
      .update(entity)
      .where({ [primaryKeyColumn]: primaryKeyValue })
      .build();
    
    await this.adapter.query(query.sql, query.params);
    
    entity.syncOriginalValues();
    return entity;
  }
  
  async delete(entity: T): Promise<boolean> {
    const primaryKeyColumn = Object.entries(this.modelClass.metadata.columns)
      .find(([_, def]) => def.primary)?.[0];
      
    if (!primaryKeyColumn) {
      throw new Error(`No primary key defined for ${this.modelClass.metadata.tableName}`);
    }
    
    const primaryKeyValue = entity[primaryKeyColumn as keyof T];
    if (primaryKeyValue === undefined) {
      throw new Error('Cannot delete entity without primary key value');
    }
    
    const query = this.queryBuilder
      .delete()
      .where({ [primaryKeyColumn]: primaryKeyValue })
      .build();
    
    const result = await this.adapter.query(query.sql, query.params);
    
    return (result.rowCount ?? 0) > 0;
  }
  async query(sql: string, params?: any[]): Promise<any[]> {
    const result = await this.adapter.query(sql, params || []);
    return result.rows;
  }
}