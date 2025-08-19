const storage = require('./storage');

function createTask(name, url = '') {
  if (!name || name.trim() === '') {
    throw new Error('Task name is required');
  }
  
  return storage.createTask(name.trim(), url.trim());
}

function startTask(taskId) {
  const task = storage.getTask(taskId);
  if (!task) {
    throw new Error(`Task with ID ${taskId} not found`);
  }
  
  if (task.status === 'running') {
    throw new Error('Task is already running');
  }
  
  // Pause any currently running tasks
  const runningTasks = storage.getTasksByStatus('running');
  runningTasks.forEach(runningTask => {
    if (runningTask.id !== taskId) {
      pauseTask(runningTask.id);
    }
  });
  
  const now = new Date().toISOString();
  const newSession = {
    startTime: now,
    endTime: null,
    duration: 0
  };
  
  const updatedSessions = [...task.sessions, newSession];
  
  storage.setLastActiveTask(taskId);
  
  return storage.updateTask(taskId, {
    status: 'running',
    sessions: updatedSessions,
    lastStarted: now
  });
}

function pauseTask(taskId) {
  const task = storage.getTask(taskId);
  if (!task) {
    throw new Error(`Task with ID ${taskId} not found`);
  }
  
  if (task.status !== 'running') {
    throw new Error('Task is not currently running');
  }
  
  const now = new Date().toISOString();
  const sessions = [...task.sessions];
  const currentSession = sessions[sessions.length - 1];
  
  if (currentSession && !currentSession.endTime) {
    const startTime = new Date(currentSession.startTime);
    const endTime = new Date(now);
    const duration = Math.floor((endTime - startTime) / 1000);
    
    currentSession.endTime = now;
    currentSession.duration = duration;
    
    const totalTime = task.totalTime + duration;
    
    storage.setLastActiveTask(taskId);
    
    return storage.updateTask(taskId, {
      status: 'paused',
      sessions: sessions,
      totalTime: totalTime,
      lastPaused: now
    });
  }
  
  throw new Error('No active session found');
}

function stopTask(taskId) {
  const task = storage.getTask(taskId);
  if (!task) {
    throw new Error(`Task with ID ${taskId} not found`);
  }
  
  let updatedTask = task;
  
  if (task.status === 'running') {
    updatedTask = pauseTask(taskId);
  }
  
  return storage.updateTask(taskId, {
    status: 'stopped',
    stoppedAt: new Date().toISOString()
  });
}

function unstopTask(taskId) {
  const task = storage.getTask(taskId);
  if (!task) {
    throw new Error(`Task with ID ${taskId} not found`);
  }
  
  if (task.status !== 'stopped') {
    throw new Error('Task is not currently stopped');
  }
  
  return storage.updateTask(taskId, {
    status: 'paused',
    stoppedAt: null
  });
}

function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

function getTaskSummary(task) {
  return {
    id: task.id,
    name: task.name,
    url: task.url,
    status: task.status,
    totalTime: formatDuration(task.totalTime),
    totalTimeSeconds: task.totalTime,
    createdAt: task.createdAt,
    lastStarted: task.lastStarted,
    lastPaused: task.lastPaused,
    stoppedAt: task.stoppedAt,
    sessionCount: task.sessions.length
  };
}

function getPausedTasks() {
  return storage.getTasksByStatus('paused').map(getTaskSummary);
}

function getStoppedTasks() {
  return storage.getTasksByStatus('stopped').map(getTaskSummary);
}

function getRunningTasks() {
  return storage.getTasksByStatus('running').map(getTaskSummary);
}

function getAllTasksSummary() {
  return storage.getAllTasks().map(getTaskSummary);
}

function getLastActiveTask() {
  const task = storage.getLastActiveTask();
  return task ? getTaskSummary(task) : null;
}

function getCurrentRunningTask() {
  const runningTasks = getRunningTasks();
  return runningTasks.length > 0 ? runningTasks[0] : null;
}

function getCurrentRunningTime(task) {
  if (!task || task.status !== 'running' || !task.lastStarted) {
    return 0;
  }
  
  const startTime = new Date(task.lastStarted);
  const now = new Date();
  const currentSessionTime = Math.floor((now - startTime) / 1000);
  return task.totalTimeSeconds + currentSessionTime;
}

function getTodaysTasks() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStart = today.toISOString();
  
  const allTasks = storage.getAllTasks();
  const todaysTasks = allTasks.filter(task => {
    // Include tasks that were worked on today
    if (task.lastStarted && task.lastStarted >= todayStart) {
      return true;
    }
    if (task.lastPaused && task.lastPaused >= todayStart) {
      return true;
    }
    // Include tasks with sessions from today
    if (task.sessions && task.sessions.length > 0) {
      return task.sessions.some(session => 
        session.startTime >= todayStart || 
        (session.endTime && session.endTime >= todayStart)
      );
    }
    return false;
  });
  
  return todaysTasks.map(getTaskSummary);
}

module.exports = {
  createTask,
  startTask,
  pauseTask,
  stopTask,
  unstopTask,
  getPausedTasks,
  getStoppedTasks,
  getRunningTasks,
  getAllTasksSummary,
  getTaskSummary,
  getLastActiveTask,
  getCurrentRunningTask,
  getCurrentRunningTime,
  getTodaysTasks,
  formatDuration
};