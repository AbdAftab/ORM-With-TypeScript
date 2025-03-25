import { ModelMetadata } from './types';

export abstract class Model {
  static metadata: ModelMetadata;
  private originalValues: Record<string, any> = {};
  
  constructor(data?: Record<string, any>) {
    if (data) {
      Object.assign(this, data);
      this.originalValues = { ...data };
    }
  }

  getChanges(): Record<string, any> {
    const changes: Record<string, any> = {};
    const modelClass = this.constructor as typeof Model;
    const columnNames = Object.keys(modelClass.metadata.columns);
    
    for (const column of columnNames) {
      if (this[column as keyof this] !== this.originalValues[column]) {
        changes[column] = this[column as keyof this];
      }
    }
    
    return changes;
  }
  hasChanges(): boolean {
    return Object.keys(this.getChanges()).length > 0;
  }
  syncOriginalValues(): void {
    const modelClass = this.constructor as typeof Model;
    const columnNames = Object.keys(modelClass.metadata.columns);
    for (const column of columnNames) {
      this.originalValues[column] = this[column as keyof this];
    }
  }
}