const { Client } = require('pg');
require('dotenv').config({path: '../.env'});
const client = new Client({ connectionString: process.env.DATABASE_URL + '?sslmode=require' });
client.connect().then(async () => {
  const res = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'organization_services' AND table_schema = 'itpc'");
  console.log('organization_services columns:', res.rows.map(r => r.column_name));
  
  const res2 = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'service_items' AND table_schema = 'itpc'");
  console.log('service_items columns:', res2.rows.map(r => r.column_name));
  
  client.end();
}).catch(console.error);
