const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');

let pool;

async function initialize() {
    const host = process.env.DB_HOST || 'localhost';
    const user = process.env.DB_USER || 'root';
    const password = process.env.DB_PASSWORD || '';
    const dbName = process.env.DB_NAME || 'focus_tracker';

    const conn = await mysql.createConnection({ host, user, password });
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    await conn.end();

    pool = mysql.createPool({
        host,
        user,
        password,
        database: dbName,
        waitForConnections: true,
        connectionLimit: 10,
        dateStrings: true
    });

    const schemaConn = await mysql.createConnection({
        host, user, password, database: dbName,
        multipleStatements: true,
        dateStrings: true
    });
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await schemaConn.query(schema);
    await schemaConn.end();

    const [rows] = await pool.execute('SELECT COUNT(*) as c FROM users');
    if (!rows[0] || rows[0].c === 0) {
        const bcrypt = require('bcryptjs');
        const hash = bcrypt.hashSync('admin123', 10);
        await pool.execute(
            'INSERT INTO users (username, email, password_hash, full_name, role, avatar_color) VALUES (?, ?, ?, ?, ?, ?)',
            ['admin', 'admin@focustrack.io', hash, 'Administrator', 'admin', '#6366f1']
        );
        console.log('Default admin created — username: admin, password: admin123');
    }

    console.log('MySQL database connected and initialized');
}

function getDb() {
    return {
        prepare(sql) {
            return {
                async get(...params) {
                    const [rows] = await pool.execute(sql, params);
                    return rows[0];
                },
                async all(...params) {
                    const [rows] = await pool.execute(sql, params);
                    return rows;
                },
                async run(...params) {
                    const [result] = await pool.execute(sql, params);
                    return { lastInsertRowid: result.insertId };
                }
            };
        },
        async query(sql, params) {
            const [rows] = await pool.execute(sql, params || []);
            return rows;
        },
        async rawQuery(sql) {
            const [rows] = await pool.query(sql);
            return rows;
        }
    };
}

module.exports = { initialize, getDb };
