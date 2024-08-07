const jayson = require('jayson');
const cors = require('cors');
const express = require('express');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
require('dotenv').config();

// Configurar la conexión a PostgreSQL
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Función para ejecutar consultas
const executeQuery = async (query, params) => {
  const client = await pool.connect();
  try {
    const res = await client.query(query, params);
    return res;
  } finally {
    client.release();
  }
};

// Define JSON-RPC methods
const methods = {
  createTask: async (args, cb) => {
    const task = args[0];
    if (task && typeof task === 'object' && Object.keys(task).length >= 5) {
      const query = 'INSERT INTO tasks (nombre, apellido, titulo, descripcion, estado) VALUES ($1, $2, $3, $4, $5) RETURNING *';
      const values = [task.Nombre, task.Apellido, task.Titulo, task.Descripcion, task.Estado];
      try {
        const result = await executeQuery(query, values);
        cb(null, { message: 'Task created', task: result.rows[0] });
      } catch (err) {
        cb({ code: -32603, message: 'Error creating task', data: err });
      }
    } else {
      cb({ code: -32602, message: "Invalid params: The task must have at least 5 attributes" });
    }
  },

  getTask: async (args, cb) => {
    const id = args[0];
    const query = 'SELECT * FROM tasks WHERE id = $1';
    try {
      const result = await executeQuery(query, [id]);
      if (result.rows.length > 0) {
        cb(null, result.rows[0]);
      } else {
        cb({ code: -32602, message: "Task not found" });
      }
    } catch (err) {
      cb({ code: -32603, message: 'Error fetching task', data: err });
    }
  },

  updateTask: async (args, cb) => {
    const id = args[0];
    const updatedTask = args[1];
    console.log("Updated Task:", updatedTask);  // Log the updatedTask for debugging
    if (updatedTask && typeof updatedTask === 'object' && Object.keys(updatedTask).length >= 5) {
      const query = 'UPDATE tasks SET nombre = $1, apellido = $2, titulo = $3, descripcion = $4, estado = $5 WHERE id = $6 RETURNING *';
      const values = [updatedTask.Nombre, updatedTask.Apellido, updatedTask.Titulo, updatedTask.Descripcion, updatedTask.Estado, id];
      console.log("Query Values:", values);  // Log the values for debugging
      try {
        const result = await executeQuery(query, values);
        if (result.rows.length > 0) {
          cb(null, { message: 'Task updated', task: result.rows[0] });
        } else {
          cb({ code: -32602, message: "Task not found" });
        }
      } catch (err) {
        cb({ code: -32603, message: 'Error updating task', data: err });
      }
    } else {
      cb({ code: -32602, message: "Invalid params: The task must have at least 5 attributes" });
    }
  },

  deleteTask: async (args, cb) => {
    const id = args[0];
    const query = 'DELETE FROM tasks WHERE id = $1 RETURNING *';
    try {
      const result = await executeQuery(query, [id]);
      if (result.rows.length > 0) {
        cb(null, { message: 'Task deleted' });
      } else {
        cb({ code: -32602, message: "Task not found" });
      }
    } catch (err) {
      cb({ code: -32603, message: 'Error deleting task', data: err });
    }
  },

  getAllTasks: async (args, cb) => {
    const query = 'SELECT * FROM tasks';
    try {
      const result = await executeQuery(query);
      cb(null, result.rows);
    } catch (err) {
      cb({ code: -32603, message: 'Error fetching tasks', data: err });
    }
  },
};

// Crea el servidor JSON-RPC con los métodos definidos
const server = new jayson.Server(methods);

// Usa Express para manejar CORS y el parsing del cuerpo de las solicitudes
const app = express();
app.use(cors());
app.use(bodyParser.json()); // parsear los cuerpos de las solicitudes JSON

// Middleware de jayson para manejar solicitudes JSON-RPC
app.use('/rpc', server.middleware());


// Inicia el servidor en el puerto 3000
app.listen(3000, () => {
  console.log('JSON-RPC server is running on port 3000');
});