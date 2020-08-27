import { TypeOrmModule } from '@nestjs/typeorm';
import { MongoMemoryServer } from 'mongodb-memory-server';

export const mongod = new MongoMemoryServer();

export default (customOpts: any = {}) => TypeOrmModule.forRootAsync({
  useFactory: async () => {
    const port = await mongod.getPort();
    const database = await mongod.getDbName();
    const entityDir = __dirname.replace('test', 'src');

    return {
      type: 'mongodb',
      host: '127.0.0.1',
      port,
      database,
      entities: [entityDir + '/**/*.entity{.ts,.js}'],
      ...customOpts,
    };
  },
});
