const express = require('express');
const cassandra = require('cassandra-driver');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const dotenv = require('dotenv');
dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

// Connect to your AstraDB
const cloud = { secureConnectBundle: 'secure-connect-tasks.zip' };
const authProvider = new cassandra.auth.PlainTextAuthProvider('token', process.env['ASTRA_DB_APPLICATION_TOKEN']);
const client = new cassandra.Client({ cloud, authProvider });

// Connect to the database
client.connect()
  .then(() => console.log('Connected to AstraDB'))
  .catch((err) => console.error('Error connecting to AstraDB', err));

// Create tasks table if not exists
const createTable = `
  CREATE TABLE IF NOT EXISTS default_keyspace.tasks (
    id UUID PRIMARY KEY,
    task_name text,
    status text
  )
`;

client.execute(createTable)
  .then(() => console.log('Table created or already exists'))
  .catch((err) => console.error('Error creating table', err));

// API endpoints
app.post('/tasks', async (req, res) => {
    const { task_name } = req.body;
    const id = uuidv4();
    const query = 'INSERT INTO default_keyspace.tasks (id, task_name, status) VALUES (?, ?, ?)';
    
    try {
      await client.execute(query, [id, task_name, 'pending'], { prepare: true });
      res.status(201).json({ message: 'Task created successfully', id: id });
    } catch (err) {
      console.error('Error creating task:', err);
      res.status(500).json({ error: 'Error creating task' });
    }
  });
  
  app.put('/tasks/:id/complete', async (req, res) => {
    const { id } = req.params;
    const query = 'UPDATE default_keyspace.tasks SET status = ? WHERE id = ?';
    
    try {
      await client.execute(query, ['completed', id], { prepare: true });
      res.json({ message: 'Task marked as completed' });
    } catch (err) {
      console.error('Error updating task:', err);
      res.status(500).json({ error: 'Error updating task' });
    }
  });
  
  app.get('/tasks', async (req, res) => {
    const query = 'SELECT * FROM default_keyspace.tasks';
    
    try {
      const result = await client.execute(query);
      res.json(result.rows);
    } catch (err) {
      console.error('Error fetching tasks:', err);
      res.status(500).json({ error: 'Error fetching tasks' });
    }
  });

  app.delete('/tasks/completed', async (req, res) => {
    try {
      // First, fetch all completed tasks
      const fetchQuery = 'SELECT id FROM default_keyspace.tasks WHERE status = ? ALLOW FILTERING';
      const fetchResult = await client.execute(fetchQuery, ['completed'], { prepare: true });
      
      // If there are no completed tasks, return early
      if (fetchResult.rowLength === 0) {
        return res.json({ message: 'No completed tasks to delete' });
      }
  
      // Prepare batch of delete queries
      const deleteQueries = fetchResult.rows.map(row => {
        return {
          query: 'DELETE FROM default_keyspace.tasks WHERE id = ?',
          params: [row.id]
        };
      });
  
      // Execute batch delete
      await client.batch(deleteQueries, { prepare: true });
      
      res.json({ message: 'Completed tasks deleted successfully' });
    } catch (err) {
      console.error('Error deleting completed tasks:', err);
      res.status(500).json({ error: 'Error deleting completed tasks', details: err.message });
    }
  });
  
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });