import { ColumnDefinition, ModelMetadata } from '../';
const META_KEY = Symbol('my_symbol_is_unique');

export function Entity(tableName: string) {
  return function(target: any) {
    const metadata: ModelMetadata = Reflect.getMetadata(META_KEY, target) || {
      tableName: '',
      columns: {}
    };
    metadata.tableName = tableName;
    Reflect.defineMetadata(META_KEY, metadata, target);
    target.metadata = metadata;
    return target;
  };
}

export function Column(options: Partial<ColumnDefinition> = {}) {
  return function(target: any, propertyKey: string) {
    const metadata: ModelMetadata = Reflect.getMetadata(META_KEY, target.constructor) || {
      tableName: '',
      columns: {}
    };

    if (!options.type) {
      const type = Reflect.getMetadata('design:type', target, propertyKey);
      if (type === String) {
        options.type = 'string';
      } else if (type === Number) {
        options.type = 'number';
      } else if (type === Boolean) {
        options.type = 'boolean';
      } else if (type === Date) {
        options.type = 'date';
      } else if (type === Array) {
        options.type = 'array';
      } else if (type === Object) {
        options.type = 'json';
      } else {
        throw new Error(`Cannot determine column type for ${propertyKey}`);
      }
    }
    metadata.columns[propertyKey] = {
      type: options.type,
      primary: options.primary || false,
      nullable: options.nullable ?? true,
      unique: options.unique || false,
      default: options.default,
      references: options.references,
      name: options.name
    };
    Reflect.defineMetadata(META_KEY, metadata, target.constructor);
  
    target.constructor.metadata = metadata;
  };
}

export function PrimaryKey(options: Partial<Omit<ColumnDefinition, 'primary'>> = {}) {
  return Column({ ...options, primary: true });
}

export function PrimaryGeneratedColumn(options: Partial<Omit<ColumnDefinition, 'primary'>> = {}) {
  return PrimaryKey({ ...options, default: 'SERIAL' });
}

export function ForeignKey(options: { table: string; column: string }) {
  return Column({
    references: options
  });
}