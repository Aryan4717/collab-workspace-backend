import { DataSource } from 'typeorm';
import { dataSourceOptions } from './database';

// This file is used by TypeORM CLI for migrations
export default new DataSource(dataSourceOptions);

