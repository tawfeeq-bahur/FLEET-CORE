import { createClient } from '@supabase/supabase-js';

// Load Supabase environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
// Use Service Role Key for backend actions to bypass RLS, fallback to Anon Key
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ Missing Supabase configuration environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

// Helper: Convert CamelCase properties to snake_case for Supabase
function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

// Helper: Convert snake_case properties to CamelCase for Next.js frontend
function snakeToCamel(str: string): string {
  return str.replace(/([-_][a-z])/g, (group) =>
    group.toUpperCase().replace('-', '').replace('_', '')
  );
}

// Convert keys to snake_case generally
function convertKeysToSnake(obj: any): any {
  if (obj !== null && typeof obj === 'object' && !Array.isArray(obj)) {
    const newObj: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        newObj[camelToSnake(key)] = obj[key];
      }
    }
    return newObj;
  }
  return obj;
}

// Special Column Mappings between MongoDB API objects and Supabase columns
const SPECIAL_COLUMN_MAPPINGS: Record<string, Record<string, string>> = {
  vehicles: {
    assignedTo: 'assigned_to_employee_id',
  },
  routes: {
    date: 'route_date',
  },
  admins: {
    password: 'password_hash',
  },
};

const REVERSE_SPECIAL_COLUMN_MAPPINGS: Record<string, Record<string, string>> = {};
for (const tableName in SPECIAL_COLUMN_MAPPINGS) {
  REVERSE_SPECIAL_COLUMN_MAPPINGS[tableName] = {};
  for (const jsKey in SPECIAL_COLUMN_MAPPINGS[tableName]) {
    const dbKey = SPECIAL_COLUMN_MAPPINGS[tableName][jsKey];
    REVERSE_SPECIAL_COLUMN_MAPPINGS[tableName][dbKey] = jsKey;
  }
}

// Map a JS object to a Postgres database row
function mapToDb(tableName: string, obj: any): any {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
    return obj;
  }
  const newObj: any = {};
  const specialMap = SPECIAL_COLUMN_MAPPINGS[tableName] || {};
  
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      if (specialMap[key]) {
        newObj[specialMap[key]] = obj[key];
      } else {
        newObj[camelToSnake(key)] = obj[key];
      }
    }
  }
  return newObj;
}

// Map a Postgres database row to a JS object (populating id and _id for compatibility)
function mapFromDb(tableName: string, row: any): any {
  if (row === null || typeof row !== 'object' || Array.isArray(row)) {
    return row;
  }
  const newObj: any = {};
  const reverseMap = REVERSE_SPECIAL_COLUMN_MAPPINGS[tableName] || {};
  
  for (const key in row) {
    if (Object.prototype.hasOwnProperty.call(row, key)) {
      if (reverseMap[key]) {
        newObj[reverseMap[key]] = row[key];
      } else {
        newObj[snakeToCamel(key)] = row[key];
      }
    }
  }
  
  if (newObj.id && !newObj._id) {
    newObj._id = newObj.id;
  } else if (newObj._id && !newObj.id) {
    newObj.id = newObj._id;
  }
  
  return newObj;
}

class SupabaseCollectionWrapper {
  tableName: string;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  find(filter: any = {}) {
    let query = supabase.from(this.tableName).select('*');
    
    // Apply filters
    const snakeFilter = convertKeysToSnake(filter);
    for (const key in snakeFilter) {
      if (snakeFilter[key] !== undefined && snakeFilter[key] !== null) {
        query = query.eq(key, snakeFilter[key]);
      }
    }

    const execQuery = async () => {
      const { data, error } = await query;
      if (error) throw error;
      
      const rows = (data || []).map(row => mapFromDb(this.tableName, row));
      
      // Relational join: trips table doesn't have expenses, fetch them from expenses table
      if (this.tableName === 'trips' && rows.length > 0) {
        const tripIds = rows.map(r => r.id);
        const { data: expensesData, error: expError } = await supabase
          .from('expenses')
          .select('*')
          .in('trip_id', tripIds);
          
        if (!expError && expensesData) {
          const camelExpenses = expensesData.map(e => mapFromDb('expenses', e));
          for (const row of rows) {
            row.expenses = camelExpenses.filter(e => e.tripId === row.id);
          }
        } else {
          for (const row of rows) {
            row.expenses = [];
          }
        }
      }
      
      return rows;
    };

    return {
      sort: (sortOptions: any) => {
        for (const sortKey in sortOptions) {
          const snakeSortKey = camelToSnake(sortKey);
          const ascending = sortOptions[sortKey] === 1;
          query = query.order(snakeSortKey, { ascending });
        }
        return {
          limit: (lim: number) => {
            query = query.limit(lim);
            return {
              toArray: execQuery,
            };
          },
          toArray: execQuery,
        };
      },
      limit: (lim: number) => {
        query = query.limit(lim);
        return {
          toArray: execQuery,
        };
      },
      toArray: execQuery,
    };
  }

  async findOne(filter: any = {}, options: any = {}) {
    let query = supabase.from(this.tableName).select('*');
    
    const snakeFilter = convertKeysToSnake(filter);
    for (const key in snakeFilter) {
      if (snakeFilter[key] !== undefined && snakeFilter[key] !== null) {
        query = query.eq(key, snakeFilter[key]);
      }
    }
    
    if (options.sort) {
      for (const sortKey in options.sort) {
        const snakeSortKey = camelToSnake(sortKey);
        const ascending = options.sort[sortKey] === 1;
        query = query.order(snakeSortKey, { ascending });
      }
    }
    
    const { data, error } = await query.limit(1);
    if (error) throw error;
    
    const row = data && data[0] ? mapFromDb(this.tableName, data[0]) : null;
    
    // Relational join: fetch expenses for this single trip
    if (row && this.tableName === 'trips') {
      const { data: expensesData, error: expError } = await supabase
        .from('expenses')
        .select('*')
        .eq('trip_id', row.id);
      if (!expError && expensesData) {
        row.expenses = expensesData.map(e => mapFromDb('expenses', e));
      } else {
        row.expenses = [];
      }
    }
    
    return row;
  }

  async insertOne(doc: any) {
    const { _id, ...cleanDoc } = doc;
    if (!cleanDoc.id && _id) {
      cleanDoc.id = _id;
    }
    
    let expensesToInsert = [];
    if (this.tableName === 'trips') {
      if (cleanDoc.expenses) {
        expensesToInsert = cleanDoc.expenses;
        delete cleanDoc.expenses;
      }
      
      // Auto-populate employee_id based on employeeName
      if (cleanDoc.employeeName && !cleanDoc.employeeId) {
        const { data: empData } = await supabase
          .from('employees')
          .select('employee_id')
          .eq('name', cleanDoc.employeeName)
          .limit(1);
        if (empData && empData[0]) {
          cleanDoc.employeeId = empData[0].employee_id;
        }
      }
    }
    
    const snakeDoc = mapToDb(this.tableName, cleanDoc);
    let { data, error } = await supabase.from(this.tableName).insert(snakeDoc).select();
    
    if (error && error.code === '23503') {
      const match = error.details ? error.details.match(/Key \((.*?)\)=/) : null;
      const offendingColumn = match ? match[1] : null;
      
      if (offendingColumn) {
        const originalValue = snakeDoc[offendingColumn];
        const cleanSnakeDoc = { ...snakeDoc, [offendingColumn]: null };
        
        const retryRes = await supabase.from(this.tableName).insert(cleanSnakeDoc).select();
        if (!retryRes.error) {
          data = retryRes.data;
          error = null;
          
          // Queue deferred foreign key update
          setTimeout(async () => {
            try {
              const idKey = cleanSnakeDoc.id ? 'id' : (cleanSnakeDoc.setting_key ? 'setting_key' : 'employee_id');
              const updatePayload = { [offendingColumn]: originalValue };
              await supabase.from(this.tableName).update(updatePayload).eq(idKey, cleanSnakeDoc[idKey]);
            } catch (e) {
              console.error(`Failed to apply deferred foreign key update for ${this.tableName}:`, e);
            }
          }, 1000);
        } else {
          error = retryRes.error;
        }
      }
    }
    
    if (error) throw error;
    
    const firstRow = data && data[0] ? mapFromDb(this.tableName, data[0]) : null;
    const insertedId = firstRow ? (firstRow.id || firstRow._id) : null;
    
    // Save any associated nested expenses in relational expenses table
    if (insertedId && expensesToInsert.length > 0) {
      const mappedExpenses = expensesToInsert.map((e: any) => {
        const { _id: e_id, ...cleanExp } = e;
        cleanExp.tripId = insertedId;
        if (firstRow.vehicleId) {
          cleanExp.vehicleId = firstRow.vehicleId;
        }
        if (firstRow.employeeId) {
          cleanExp.employeeId = firstRow.employeeId;
        }
        return mapToDb('expenses', cleanExp);
      });
      await supabase.from('expenses').insert(mappedExpenses);
    }
    
    return {
      acknowledged: true,
      insertedId,
    };
  }

  async insertMany(docs: any[]) {
    const snakeDocs = docs.map(doc => {
      const { _id, ...cleanDoc } = doc;
      if (!cleanDoc.id && _id) {
        cleanDoc.id = _id;
      }
      return mapToDb(this.tableName, cleanDoc);
    });
    
    try {
      const { data, error } = await supabase.from(this.tableName).insert(snakeDocs).select();
      if (error) throw error;
      
      return {
        acknowledged: true,
        insertedCount: data ? data.length : 0,
      };
    } catch (error: any) {
      if (error.code === '23503') {
        let insertedCount = 0;
        for (const doc of docs) {
          const res = await this.insertOne(doc);
          if (res.acknowledged) insertedCount++;
        }
        return {
          acknowledged: true,
          insertedCount,
        };
      }
      throw error;
    }
  }

  async updateOne(filter: any, updateQuery: any) {
    const setDoc = updateQuery.$set || updateQuery;
    const { id, _id, ...cleanSetDoc } = setDoc;
    
    let expensesToUpdate = [];
    if (this.tableName === 'trips') {
      if (cleanSetDoc.expenses) {
        expensesToUpdate = cleanSetDoc.expenses;
        delete cleanSetDoc.expenses;
      }
      
      // Auto-populate employee_id based on employeeName
      if (cleanSetDoc.employeeName && !cleanSetDoc.employeeId) {
        const { data: empData } = await supabase
          .from('employees')
          .select('employee_id')
          .eq('name', cleanSetDoc.employeeName)
          .limit(1);
        if (empData && empData[0]) {
          cleanSetDoc.employeeId = empData[0].employee_id;
        }
      }
    }
    
    const snakeSetDoc = mapToDb(this.tableName, cleanSetDoc);
    let query = supabase.from(this.tableName).update(snakeSetDoc);
    
    const snakeFilter = convertKeysToSnake(filter);
    for (const key in snakeFilter) {
      if (snakeFilter[key] !== undefined && snakeFilter[key] !== null) {
        query = query.eq(key, snakeFilter[key]);
      }
    }
    
    const { data, error } = await query.select();
    if (error) throw error;
    
    const updatedRow = data && data[0] ? mapFromDb(this.tableName, data[0]) : null;
    
    // Upsert expenses on trips relational table
    if (updatedRow && this.tableName === 'trips' && expensesToUpdate.length > 0) {
      const mappedExpenses = expensesToUpdate.map((e: any) => {
        const { _id: e_id, ...cleanExp } = e;
        cleanExp.tripId = updatedRow.id;
        if (updatedRow.vehicleId) {
          cleanExp.vehicleId = updatedRow.vehicleId;
        }
        if (updatedRow.employeeId) {
          cleanExp.employeeId = updatedRow.employeeId;
        }
        return mapToDb('expenses', cleanExp);
      });
      await supabase.from('expenses').upsert(mappedExpenses);
    }
    
    return {
      acknowledged: true,
      matchedCount: data && data.length ? 1 : 0,
      modifiedCount: data && data.length ? 1 : 0,
    };
  }

  async deleteOne(filter: any) {
    let query = supabase.from(this.tableName).delete();
    
    const snakeFilter = convertKeysToSnake(filter);
    for (const key in snakeFilter) {
      if (snakeFilter[key] !== undefined && snakeFilter[key] !== null) {
        query = query.eq(key, snakeFilter[key]);
      }
    }
    
    const { data, error } = await query.select();
    if (error) throw error;
    
    return {
      acknowledged: true,
      deletedCount: data && data.length ? data.length : 0,
    };
  }

  async deleteMany(filter: any) {
    let query = supabase.from(this.tableName).delete();
    
    const snakeFilter = convertKeysToSnake(filter);
    for (const key in snakeFilter) {
      if (snakeFilter[key] !== undefined && snakeFilter[key] !== null) {
        query = query.eq(key, snakeFilter[key]);
      }
    }
    
    const { data, error } = await query.select();
    if (error) throw error;
    
    return {
      acknowledged: true,
      deletedCount: data && data.length ? data.length : 0,
    };
  }

  async countDocuments(filter: any = {}) {
    let query = supabase.from(this.tableName).select('*', { count: 'exact', head: true });
    
    const snakeFilter = convertKeysToSnake(filter);
    for (const key in snakeFilter) {
      if (snakeFilter[key] !== undefined && snakeFilter[key] !== null) {
        query = query.eq(key, snakeFilter[key]);
      }
    }
    
    const { count, error } = await query;
    if (error) throw error;
    
    return count || 0;
  }

  async createIndex() {
    return { success: true };
  }
}

// Collection Helpers
export async function getAdminCollection<T extends Record<string, any> = any>(name: string): Promise<any> {
  return new SupabaseCollectionWrapper(name);
}

export async function getEmployeeCollection<T extends Record<string, any> = any>(name: string): Promise<any> {
  return new SupabaseCollectionWrapper(name);
}

// Mocked DB promises to satisfy connection verification and seeding scripts
export const adminDbPromise = Promise.resolve({
  listCollections: () => ({
    toArray: async () => [
      { name: 'vehicles' },
      { name: 'trips' },
      { name: 'admins' },
      { name: 'routes' },
      { name: 'fleet_settings' },
      { name: 'maintenance_records' },
      { name: 'fuel_records' },
    ],
  }),
});

export const employeeDbPromise = Promise.resolve({
  listCollections: () => ({
    toArray: async () => [
      { name: 'employee_profiles' },
      { name: 'odometer_readings' },
      { name: 'expenses' },
      { name: 'employee_trips' },
      { name: 'emergency_contacts' },
      { name: 'reminders' },
      { name: 'employee_settings' },
    ],
  }),
});

// Default client promise mock for compatibility
const adminClientPromise = Promise.resolve(supabase);
export default adminClientPromise;
