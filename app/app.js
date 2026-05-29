const express = require('express');
const fs = require('fs');
const { Pool } = require('pg');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const configPath = process.env.CONFIG_PATH || '/etc/devops_labs/config.json';
let config = {
    host: '127.0.0.1',
    port: 3000,
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
        config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (e) {
        console.error('Failed to read config, using default values:', e.message);
    }
}

const pool = new Pool(config.db);

app.get('/health/alive', (req, res) => {
    res.status(200).send('OK');
});

app.get('/health/ready', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.status(200).send('OK');
    } catch (err) {
        res.status(500).send(`Service not ready. Reason: Database unavailable (${err.message})`);
    }
});

app.get('/', (req, res) => {
    const accept = req.headers['accept'] || '';
    if (!accept.includes('text/html') && accept !== '*/*') {
        return res.status(406).send('Not Acceptable. This endpoint only supports text/html');
    }

    const html = `
    <!DOCTYPE html>
    <html>
    <head><title>DevOps Labs - Task Tracker</title></head>
    <body>
        <h1>Application Business Endpoints</h1>
        <ul>
            <li><strong>GET /tasks</strong> — get all tasks</li>
            <li><strong>POST /tasks</strong> — create a new task (parameter: title)</li>
            <li><strong>POST /tasks/&lt;id&gt;/done</strong> — mark task as done</li>
        </ul>
    </body>
    </html>
    `;
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
});

app.get('/tasks', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, title, status, created_at FROM tasks ORDER BY created_at DESC');
        const tasks = result.rows;
        const accept = req.headers['accept'] || '';

        if (accept.includes('text/html')) {
            let tableRows = '';
            tasks.forEach(task => {
                tableRows += `<tr><td>${task.id}</td><td>${task.title}</td><td>${task.status}</td><td>${task.created_at}</td></tr>`;
            });

            const html = `
            <!DOCTYPE html>
            <html>
            <head><title>Tasks List</title></head>
            <body>
                <h1>All Tasks</h1>
                <table border="1">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Title</th>
                            <th>Status</th>
                            <th>Created At</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows || '<tr><td colspan="4">No tasks found</td></tr>'}
                    </tbody>
                </table>
            </body>
            </html>
            `;
            res.setHeader('Content-Type', 'text/html');
            return res.send(html);
        }

        res.setHeader('Content-Type', 'application/json');
        return res.json(tasks);

    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

app.post('/tasks', async (req, res) => {
    const title = req.body.title;
    if (!title) {
        return res.status(400).send('Error: parameter "title" is required');
    }

    try {
        const result = await pool.query(
            'INSERT INTO tasks (title, status) VALUES ($1, $2) RETURNING id, title, status, created_at',
            [title, 'pending']
        );
        const newTask = result.rows[0];
        const accept = req.headers['accept'] || '';

        if (accept.includes('text/html')) {
            const html = `
            <!DOCTYPE html>
            <html>
            <head><title>Task Created</title></head>
            <body>
                <h1>Task created successfully!</h1>
                <p><b>ID:</b> ${newTask.id}</p>
                <p><b>Title:</b> ${newTask.title}</p>
                <p><b>Status:</b> ${newTask.status}</p>
                <p><a href="/tasks">Back to list</a></p>
            </body>
            </html>
            `;
            res.setHeader('Content-Type', 'text/html');
            return res.send(html);
        }

        res.setHeader('Content-Type', 'application/json');
        return res.status(201).json(newTask);

    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

app.post('/tasks/:id/done', async (req, res) => {
    const id = req.params.id;

    try {
        const result = await pool.query(
            "UPDATE tasks SET status = 'done' WHERE id = $1 RETURNING id, title, status, created_at",
            [id]
        );

        if (result.rowCount === 0) {
            return res.status(404).send('Error: Task with this ID not found');
        }

        const updatedTask = result.rows[0];
        const accept = req.headers['accept'] || '';

        if (accept.includes('text/html')) {
            const html = `
            <!DOCTYPE html>
            <html>
            <head><title>Task Completed</title></head>
            <body>
                <h1>Task status updated!</h1>
                <p><b>ID:</b> ${updatedTask.id}</p>
                <p><b>Title:</b> ${updatedTask.title}</p>
                <p><b>New Status:</b> ${updatedTask.status}</p>
                <p><a href="/tasks">Back to list</a></p>
            </body>
            </html>
            `;
            res.setHeader('Content-Type', 'text/html');
            return res.send(html);
        }

        res.setHeader('Content-Type', 'application/json');
        return res.json(updatedTask);

    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

if (process.env.LISTEN_FDS === '1') {
    app.listen({ fd: 3 }, () => {
        console.log('Application started successfully via systemd socket activation (fd: 3).');
    });
} else {
    app.listen(config.port, config.host, () => {
        console.log(`Застосунок запущено локально на http://${config.host}:${config.port}`);
    });
}