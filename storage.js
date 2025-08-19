const fs = require('fs');
const path = require('path');
const os = require('os');

const DATA_FILE = path.join(os.homedir(), '.timetracker-data.json');

function ensureDataFile() {
  if (!fs.existsSync(DATA_FILE)) {
    const initialData = {
      tasks: [],
      nextId: 1,
      lastActiveTaskId: null
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
  }
}

function loadData() {
  ensureDataFile();
  try {
    const rawData = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(rawData);
  } catch (error) {
    console.error('Error loading data:', error.message);
    return { tasks: [], nextId: 1, lastActiveTaskId: null };
  }
}

function saveData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error saving data:', error.message);
  }
}

function createTask(name, url = '') {
  const data = loadData();
  const newTask = {
    id: data.nextId,
    name,
    url,
    status: 'created',
    sessions: [],
    totalTime: 0,
    createdAt: new Date().toISOString()
  };
  
  data.tasks.push(newTask);
  data.nextId++;
  saveData(data);
  return newTask;
}

function getTask(id) {
  const data = loadData();
  return data.tasks.find(task => task.id === parseInt(id));
}

function updateTask(id, updates) {
  const data = loadData();
  const taskIndex = data.tasks.findIndex(task => task.id === parseInt(id));
  
  if (taskIndex === -1) {
    return null;
  }
  
  data.tasks[taskIndex] = { ...data.tasks[taskIndex], ...updates };
  saveData(data);
  return data.tasks[taskIndex];
}

function getAllTasks() {
  const data = loadData();
  return data.tasks;
}

function getTasksByStatus(status) {
  const data = loadData();
  return data.tasks.filter(task => task.status === status);
}

function setLastActiveTask(taskId) {
  const data = loadData();
  data.lastActiveTaskId = taskId;
  saveData(data);
}

function getLastActiveTask() {
  const data = loadData();
  if (data.lastActiveTaskId) {
    return data.tasks.find(task => task.id === data.lastActiveTaskId);
  }
  return null;
}

module.exports = {
  createTask,
  getTask,
  updateTask,
  getAllTasks,
  getTasksByStatus,
  setLastActiveTask,
  getLastActiveTask,
  DATA_FILE
};