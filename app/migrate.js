const fs = require('fs');
const { Client } = require('pg');

const configPath = process.env.CONFIG_PATH || '/etc/devops_labs/config.json';

let config = {
    db: {
        user: 'devops_user',
        host: '127.0.0.1',
        database: 'devops_db',
        password: 'password',
        port: 5432
    }
};

if (fs.existsSync(configPath)) {
    try {
        const fileContent = fs.readFileSync(configPath, 'utf8');
        config = JSON.parse(fileContent);
    } catch (e) {
        console.error('Error parsing config file in migration:', e.message);
    }
}

async function runMigration() {
    const client = new Client(config.db);
    try {
        await client.connect();
        console.log('Successfully connected to PostgreSQL for migration.');

        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS tasks (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                status VARCHAR(50) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `;
        await client.query(createTableQuery);
        console.log('Migration successful: "tasks" table is ready.');
        process.exit(0);
    } catch (err) {
        console.error('Critical migration error:', err.message);
        process.exit(1); 
    }
}

runMigration();