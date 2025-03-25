import { Model } from './Model';
import { ModelMetadata } from './types';

type QueryType = 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
type OrderDirection = 'ASC' | 'DESC';

interface QueryCondition {
  column: string;
  operator: string;
  value: any;
}

interface OrderByClause {
  column: string;
  direction: OrderDirection;
}

interface JoinClause {
  table: string;
  alias?: string;
  type: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL';
  on: {
    leftColumn: string;
    rightColumn: string;
  };
}

export class QueryBuilder {
  private type: QueryType = 'SELECT';
  private tableName: string;
  private metadata: ModelMetadata;
  private selectColumns: string[] = ['*'];
  private whereConditions: QueryCondition[] = [];
  private orderByClauses: OrderByClause[] = [];
  private joinClauses: JoinClause[] = [];
  private limitValue?: number;
  private offsetValue?: number;
  private insertData?: Record<string, any>;
  private updateData?: Record<string, any>;

  constructor(metadata: ModelMetadata) {
    this.metadata = metadata;
    this.tableName = metadata.tableName;
  }

  select(columns: string[] = ['*']): QueryBuilder {
    this.type = 'SELECT';
    this.selectColumns = columns;
    return this;
  }

  insert(data: Record<string, any> | Model): QueryBuilder {
    this.type = 'INSERT';
    
    if (data instanceof Model) {
      const modelData: Record<string, any> = {};
      const columns = Object.keys(this.metadata.columns);
      
      for (const column of columns) {
        const value = data[column as keyof typeof data];
        if (value !== undefined) {
          modelData[column] = value;
        }
      }
      
      this.insertData = modelData;
    } else {
      this.insertData = data;
    }
    
    return this;
  }

  update(data: Record<string, any> | Model): QueryBuilder {
    this.type = 'UPDATE';
    
    if (data instanceof Model) {
      this.updateData = data.getChanges();
    } else {
      this.updateData = data;
    }
    
    return this;
  }

  delete(): QueryBuilder {
    this.type = 'DELETE';
    return this;
  }

  where(conditions: Record<string, any>): QueryBuilder;
  where(column: string, value: any): QueryBuilder;
  where(column: string, operator: string, value: any): QueryBuilder;
  where(columnOrConditions: string | Record<string, any>, operatorOrValue?: any, value?: any): QueryBuilder {
    if (typeof columnOrConditions === 'object') {
      Object.entries(columnOrConditions).forEach(([column, value]) => {
        this.whereConditions.push({
          column,
          operator: '=',
          value
        });
      });
    } else if (value === undefined) {
      this.whereConditions.push({
        column: columnOrConditions,
        operator: '=',
        value: operatorOrValue
      });
    } else {
      this.whereConditions.push({
        column: columnOrConditions,
        operator: operatorOrValue,
        value
      });
    }
    
    return this;
  }

  orderBy(column: string, direction: OrderDirection = 'ASC'): QueryBuilder {
    this.orderByClauses.push({ column, direction });
    return this;
  }

  join(table: string, leftColumn: string, rightColumn: string, type: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL' = 'INNER', alias?: string): QueryBuilder {
    this.joinClauses.push({
      table,
      alias,
      type,
      on: {
        leftColumn,
        rightColumn
      }
    });
    
    return this;
  }

  limit(limit: number): QueryBuilder {
    this.limitValue = limit;
    return this;
  }

  offset(offset: number): QueryBuilder {
    this.offsetValue = offset;
    return this;
  }

  build(): { sql: string; params: any[] } {
    switch (this.type) {
      case 'SELECT':
        return this.buildSelect();
      case 'INSERT':
        return this.buildInsert();
      case 'UPDATE':
        return this.buildUpdate();
      case 'DELETE':
        return this.buildDelete();
      default:
        throw new Error(`Unsupported query type: ${this.type}`);
    }
  }

  private buildSelect(): { sql: string; params: any[] } {
    const parts: string[] = [`SELECT ${this.selectColumns.join(', ')} FROM "${this.tableName}"`];
    const params: any[] = [];
    if (this.joinClauses.length > 0) {
      for (const join of this.joinClauses) {
        const tablePart = join.alias ? `"${join.table}" AS "${join.alias}"` : `"${join.table}"`;
        parts.push(`${join.type} JOIN ${tablePart} ON "${join.on.leftColumn}" = "${join.on.rightColumn}"`);
      }
    }
    if (this.whereConditions.length > 0) {
      const { whereSql, whereParams } = this.buildWhereClause(params.length);
      parts.push(`WHERE ${whereSql}`);
      params.push(...whereParams);
    }
    if (this.orderByClauses.length > 0) {
      const orderClauses = this.orderByClauses
        .map(clause => `"${clause.column}" ${clause.direction}`)
        .join(', ');
        
      parts.push(`ORDER BY ${orderClauses}`);
    }
    if (this.limitValue !== undefined) {
      parts.push(`LIMIT $${params.length + 1}`);
      params.push(this.limitValue);
    }
    if (this.offsetValue !== undefined) {
      parts.push(`OFFSET $${params.length + 1}`);
      params.push(this.offsetValue);
    }

    return {
      sql: parts.join(' '),
      params
    };
  }

  private buildInsert(): { sql: string; params: any[] } {
    if (!this.insertData || Object.keys(this.insertData).length === 0) {
      throw new Error('No data provided for INSERT query');
    }
  
    const columns: string[] = [];
    const placeholders: string[] = [];
    const params: any[] = [];
  
    Object.entries(this.insertData).forEach(([propertyName, value]) => {
      // console.log(`Property: ${propertyName}, Metadata:`, this.metadata.columns[propertyName]);
      const columnName = this.getColumnName(propertyName);
      // console.log(`Mapping property ${propertyName} to column ${columnName}`);
      
      columns.push(`"${columnName}"`);
      placeholders.push(`$${params.length + 1}`);
      params.push(value);
    });
    const sql = `INSERT INTO "${this.tableName}" (${columns.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`;
    // console.log("Generated SQL:", sql);
    // console.log("With params:", params);
  
    return {
      sql,
      params
    };
  }

  private buildUpdate(): { sql: string; params: any[] } {
    if (!this.updateData || Object.keys(this.updateData).length === 0) {
      throw new Error('No data provided for UPDATE');
    }

    const setParts: string[] = [];
    const params: any[] = [];

    Object.entries(this.updateData).forEach(([propertyName, value]) => {
      const columnName = this.getColumnName(propertyName);
      setParts.push(`"${columnName}" = $${params.length + 1}`);
      params.push(value);
    });

    let sql = `UPDATE "${this.tableName}" SET ${setParts.join(', ')}`;
    if (this.whereConditions.length > 0) {
      const { whereSql, whereParams } = this.buildWhereClause(params.length);
      sql += ` WHERE ${whereSql}`;
      params.push(...whereParams);
    }
    sql += ' RETURNING *';

    return {
      sql,
      params
    };
  }

  private buildDelete(): { sql: string; params: any[] } {
    let sql = `DELETE FROM "${this.tableName}"`;
    const params: any[] = [];
    if (this.whereConditions.length > 0) {
      const { whereSql, whereParams } = this.buildWhereClause(params.length);
      sql += ` WHERE ${whereSql}`;
      params.push(...whereParams);
    } else {
      throw new Error();
    }

    return {
      sql,
      params
    };
  }

  private buildWhereClause(startParamIndex: number): { whereSql: string; whereParams: any[] } {
    const conditions: string[] = [];
    const params: any[] = [];
    
    this.whereConditions.forEach(condition => {
      const columnName = this.getColumnName(condition.column);
      conditions.push(`"${columnName}" ${condition.operator} $${startParamIndex + params.length + 1}`);
      params.push(condition.value);
    });
    
    return {
      whereSql: conditions.join(' AND '),
      whereParams: params
    };
  }
  private getColumnName(propertyName: string): string {
    const columnDef = this.metadata.columns[propertyName];
    if (!columnDef) {
      // console.warn(`No column definition found for property: ${propertyName}`);
      return propertyName;
    }
    // console.log("WHY IS THIS UNDEFINED",columnDef.name)
    const mappedName = columnDef.name || propertyName;
    // console.log(`Column mapping: ${propertyName} → ${mappedName}`);
    return mappedName;
  }
  reset(): void {
    this.type = 'SELECT';
    this.selectColumns = ['*'];
    this.whereConditions = [];
    this.orderByClauses = [];
    this.joinClauses = [];
    this.limitValue = undefined;
    this.offsetValue = undefined;
    this.insertData = undefined;
    this.updateData = undefined;
  }
}