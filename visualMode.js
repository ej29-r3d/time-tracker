const chalk = require('chalk');
const taskManager = require('./taskManager');

class VisualMode {
  constructor() {
    this.tasks = [];
    this.selectedIndex = 0;
    this.isActive = false;
    this.timerInterval = null;
    this.inputBuffer = '';
    this.showCursor = true;
    this.cursorInterval = null;
  }

  async start() {
    // Check if stdin is a TTY (interactive terminal)
    if (!process.stdin.isTTY) {
      console.log(chalk.red('Visual mode requires an interactive terminal'));
      return false;
    }

    this.tasks = taskManager.getTodaysTasks().filter(task => task.status !== 'stopped');
    
    // If no tasks, create a placeholder
    if (this.tasks.length === 0) {
      this.tasks = [];
    }

    this.isActive = true;
    this.selectedIndex = 0;
    
    // Find currently running task and select it
    const runningTaskIndex = this.tasks.findIndex(task => task.status === 'running');
    if (runningTaskIndex !== -1) {
      this.selectedIndex = runningTaskIndex;
    }

    this.setupKeyInput();
    this.startTimer();
    this.startCursor();
    this.render();
    return true;
  }

  setupKeyInput() {
    // Store original stdin settings
    this.originalRawMode = process.stdin.isRaw;
    
    // Enable raw mode for key detection
    process.stdin.setRawMode(true);
    process.stdin.setEncoding('utf8');
    process.stdin.resume();
    
    // Remove existing listeners and add our handler
    process.stdin.removeAllListeners('data');
    process.stdin.on('data', this.handleKeyPress.bind(this));
  }

  handleKeyPress(key) {
    if (!this.isActive) return;

    switch (key) {
      case '\u001b[A': // Up arrow
        if (this.tasks.length > 0) {
          this.selectedIndex = Math.max(0, this.selectedIndex - 1);
          this.render();
        }
        break;
        
      case '\u001b[B': // Down arrow
        if (this.tasks.length > 0) {
          this.selectedIndex = Math.min(this.tasks.length - 1, this.selectedIndex + 1);
          this.render();
        }
        break;
        
      case '\r': // Enter
      case '\n':
        if (this.inputBuffer.trim()) {
          this.processCommand();
        } else if (this.tasks.length > 0) {
          this.toggleSelectedTask();
        }
        break;
        
      case '\u0003': // Ctrl+C
        this.exit();
        break;
        
      case '\u007f': // Backspace
      case '\b':
        if (this.inputBuffer.length > 0) {
          this.inputBuffer = this.inputBuffer.slice(0, -1);
          this.render();
        }
        break;
        
      case '\u001b': // Escape - clear input
        if (this.inputBuffer.length > 0) {
          this.inputBuffer = '';
          this.render();
        } else {
          this.exit();
        }
        break;
        
      default:
        // Regular character input
        if (key.length === 1 && key >= ' ') {
          this.inputBuffer += key;
          this.render();
        }
    }
  }

  processCommand() {
    const input = this.inputBuffer.trim();
    const [command, ...args] = input.split(' ');
    
    try {
      switch (command.toLowerCase()) {
        case 'start':
          if (args.length > 0) {
            // Start specific task by name
            this.startTaskByName(args.join(' '));
          } else {
            // Start last active task
            this.startLastTask();
          }
          break;
          
        case 'stop':
          this.stopCurrentTask();
          break;
          
        case 'exit':
        case 'quit':
          this.exit();
          return;
          
        default:
          // If not a command, treat as new task name
          if (input.length > 0) {
            this.createAndStartTask(input);
          }
      }
    } catch (error) {
      this.showMessage(chalk.red(`Error: ${error.message}`), 2000);
    }
    
    this.inputBuffer = '';
    this.render();
  }

  createAndStartTask(taskName) {
    const task = taskManager.createTask(taskName);
    const updatedTask = taskManager.startTask(task.id);
    this.showMessage(chalk.green(`✓ Created and started: ${taskName}`), 1500);
    this.refreshTasks();
  }

  startTaskByName(taskName) {
    // Try to find existing task by name
    const existingTask = this.tasks.find(task => 
      task.name.toLowerCase().includes(taskName.toLowerCase())
    );
    
    if (existingTask) {
      const updatedTask = taskManager.startTask(existingTask.id);
      this.showMessage(chalk.green(`✓ Started: ${existingTask.name}`), 1500);
    } else {
      // Create new task if not found
      this.createAndStartTask(taskName);
    }
    this.refreshTasks();
  }

  startLastTask() {
    const lastTask = taskManager.getLastActiveTask();
    if (!lastTask) {
      this.showMessage(chalk.yellow('No previous task found'), 2000);
      return;
    }
    
    if (lastTask.status === 'stopped') {
      this.showMessage(chalk.yellow(`Last task "${lastTask.name}" is stopped. Please specify task name.`), 2000);
      return;
    }
    
    const updatedTask = taskManager.startTask(lastTask.id);
    this.showMessage(chalk.green(`✓ Resumed: ${lastTask.name}`), 1500);
    this.refreshTasks();
  }

  stopCurrentTask() {
    const runningTask = taskManager.getCurrentRunningTask();
    if (!runningTask) {
      this.showMessage(chalk.yellow('No task is currently running'), 2000);
      return;
    }
    
    const updatedTask = taskManager.pauseTask(runningTask.id);
    const summary = taskManager.getTaskSummary(updatedTask);
    this.showMessage(chalk.yellow(`⏸ Paused: ${summary.name} (${summary.totalTime})`), 1500);
    this.refreshTasks();
  }

  toggleSelectedTask() {
    if (this.selectedIndex < 0 || this.selectedIndex >= this.tasks.length) {
      return;
    }

    const selectedTask = this.tasks[this.selectedIndex];
    
    if (selectedTask.status === 'running') {
      const updatedTask = taskManager.pauseTask(selectedTask.id);
      const summary = taskManager.getTaskSummary(updatedTask);
      this.showMessage(chalk.yellow(`⏸ Paused: ${summary.name} (${summary.totalTime})`), 1500);
    } else {
      const updatedTask = taskManager.startTask(selectedTask.id);
      const summary = taskManager.getTaskSummary(updatedTask);
      this.showMessage(chalk.green(`✓ Started: ${summary.name}`), 1500);
    }
    
    this.refreshTasks();
  }

  refreshTasks() {
    // Refresh tasks data to get updated times
    this.tasks = taskManager.getTodaysTasks().filter(task => task.status !== 'stopped');
    
    // Ensure selectedIndex is still valid
    if (this.selectedIndex >= this.tasks.length) {
      this.selectedIndex = Math.max(0, this.tasks.length - 1);
    }
  }

  startTimer() {
    // Update display every second for running tasks
    this.timerInterval = setInterval(() => {
      if (this.isActive) {
        this.refreshTasks();
        this.render();
      }
    }, 1000);
  }

  startCursor() {
    // Blink cursor every 500ms
    this.cursorInterval = setInterval(() => {
      if (this.isActive) {
        this.showCursor = !this.showCursor;
        this.render();
      }
    }, 500);
  }

  showMessage(message, duration = 2000) {
    this.statusMessage = message;
    setTimeout(() => {
      if (this.isActive) {
        this.statusMessage = null;
        this.render();
      }
    }, duration);
  }

  render() {
    // Clear screen and move cursor to top
    console.clear();
    
    console.log(chalk.bold.green('🕒 Time Tracker - Visual Mode'));
    console.log(chalk.gray('↑/↓ to navigate, Enter to start/pause selected task, type commands below\n'));

    // Render task list
    if (this.tasks.length === 0) {
      console.log(chalk.gray('  No tasks today. Type a task name below to create and start one.\n'));
    } else {
      this.tasks.forEach((task, index) => {
        const isSelected = index === this.selectedIndex;
        const isRunning = task.status === 'running';
        const isPaused = task.status === 'paused';
        
        let prefix = '  ';
        let statusIcon = '';
        let timeDisplay = task.totalTime;
        
        if (isRunning) {
          const currentTime = taskManager.getCurrentRunningTime(task);
          timeDisplay = taskManager.formatDuration(currentTime);
          statusIcon = chalk.green('▶ ');
        } else if (isPaused) {
          statusIcon = chalk.yellow('⏸ ');
        } else {
          statusIcon = '  ';
        }
        
        if (isSelected) {
          prefix = chalk.cyan('→ ');
          const taskLine = `${prefix}${statusIcon}${task.name} (${timeDisplay})`;
          if (isRunning) {
            console.log(chalk.bgGreen.black(taskLine));
          } else {
            console.log(chalk.inverse(taskLine));
          }
        } else {
          const taskLine = `${prefix}${statusIcon}${task.name} (${timeDisplay})`;
          if (isRunning) {
            console.log(chalk.green.bold(taskLine));
          } else {
            console.log(taskLine);
          }
        }
      });
      console.log('');
    }

    // Show current running task summary
    const currentRunningTask = taskManager.getCurrentRunningTask();
    if (currentRunningTask) {
      console.log(chalk.green(`Currently running: ${currentRunningTask.name}\n`));
    }

    // Show status message if any
    if (this.statusMessage) {
      console.log(this.statusMessage);
      console.log('');
    }

    // Render input area
    console.log(chalk.gray('─'.repeat(60)));
    console.log(chalk.bold('Commands: ') + chalk.gray('start [task name], stop, exit'));
    console.log(chalk.bold('Or type task name to create and start'));
    console.log(chalk.gray('─'.repeat(60)));
    
    // Input line with cursor
    const cursor = this.showCursor ? '█' : ' ';
    console.log(`> ${this.inputBuffer}${cursor}`);
  }

  exit() {
    this.isActive = false;
    
    // Clear timers
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    
    if (this.cursorInterval) {
      clearInterval(this.cursorInterval);
      this.cursorInterval = null;
    }
    
    // Restore normal mode
    process.stdin.setRawMode(this.originalRawMode || false);
    process.stdin.removeAllListeners('data');
    process.stdin.pause();
    
    console.clear();
    console.log(chalk.green('Time tracker closed. Have a productive day! 👋\n'));
    process.exit(0);
  }
}

module.exports = VisualMode;