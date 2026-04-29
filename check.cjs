const { Client } = require('pg');
require('dotenv').config();
const client = new Client({ connectionString: process.env.DATABASE_URL + '?sslmode=require' });

client.connect().then(async () => {
  const resOrg = await client.query("SELECT id, name FROM itpc.organizations WHERE name LIKE '%قيادة%'");
  console.log('Orgs:', resOrg.rows);
  
  const id = resOrg.rows[0]?.id;
  if (id) {
    const resSrv = await client.query("SELECT id, service_type FROM itpc.organization_services WHERE organization_id = $1", [id]);
    console.log('Services:', resSrv.rows);
    
    for (const srv of resSrv.rows) {
      const resItems = await client.query("SELECT id, item_category, provider_company_id FROM itpc.service_items WHERE organization_service_id = $1", [srv.id]);
      console.log(`Items for service ${srv.id}:`, resItems.rows);
    }
  }
  
  client.end();
}).catch(console.error);
