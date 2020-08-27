module.exports = {
  type: 'mongodb',
  host: 'localhost:27017',
  database: 'sphene',
  synchronize: true,
  seeds: ['src/**/*.seed.ts'],
  factories: ['src/**/*.factory.ts'],
  entities: ['src/**/*.entity.ts']
}
