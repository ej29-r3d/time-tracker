const chalk = require('chalk');
const taskManager = require('./taskManager');

class VisualNavigation {
  constructor(parentRL) {
    this.parentRL = parentRL;
    this.tasks = [];
    this.selectedIndex = 0;
    this.isActive = false;
    this.timerInterval = null;
  }

  start() {
    this.tasks = taskManager.getTodaysTasks().filter(task => task.status !== 'stopped');
    
    if (this.tasks.length === 0) {
      console.log(chalk.yellow('\nNo tasks worked on today. Use "start <task name>" to create and start a new task.'));
      return false;
    }

    this.isActive = true;
    this.selectedIndex = 0;
    
    // Find currently running task and select it
    const runningTaskIndex = this.tasks.findIndex(task => task.status === 'running');
    if (runningTaskIndex !== -1) {
      this.selectedIndex = runningTaskIndex;
    }

    try {
      this.setupKeyNavigation();
      this.startTimer();
      this.render();
      return true;
    } catch (error) {
      console.log(chalk.yellow(error.message));
      return false;
    }
  }

  setupKeyNavigation() {
    // Check if stdin is a TTY (interactive terminal)
    if (!process.stdin.isTTY) {
      throw new Error('Visual navigation requires an interactive terminal');
    }
    
    // Store original stdin settings
    this.originalRawMode = process.stdin.isRaw;
    
    // Enable raw mode for arrow key detection
    process.stdin.setRawMode(true);
    process.stdin.setEncoding('utf8');
    
    // Remove existing listeners and add our handler
    process.stdin.removeAllListeners('data');
    process.stdin.on('data', this.handleKeyPress.bind(this));
  }

  handleKeyPress(key) {
    if (!this.isActive) return;

    const keyCode = key.charCodeAt(0);
    
    switch (key) {
      case '\u001b[A': // Up arrow
        this.selectedIndex = Math.max(0, this.selectedIndex - 1);
        this.render();
        break;
        
      case '\u001b[B': // Down arrow
        this.selectedIndex = Math.min(this.tasks.length - 1, this.selectedIndex + 1);
        this.render();
        break;
        
      case '\r': // Enter
      case '\n':
        this.selectCurrentTask();
        break;
        
      case '\u001b': // Escape
      case 'q':
        this.exit();
        break;
        
      case 'c': // Command mode
        this.exitToCommandMode();
        break;
        
      case '\u0003': // Ctrl+C
        this.exit();
        process.exit(0);
        break;
    }
  }

  render() {
    // Clear screen and move cursor to top
    console.clear();
    
    console.log(chalk.bold.green('🕒 Today\'s Tasks - Visual Navigation'));
    console.log(chalk.gray('Use ↑/↓ arrows to navigate, Enter to start/switch task, Esc/q to exit, c for command mode\n'));

    const currentRunningTask = taskManager.getCurrentRunningTask();
    
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
          // Running task selected: bright green background
          console.log(chalk.bgGreen.black(taskLine));
        } else {
          // Regular selected task: inverse colors
          console.log(chalk.inverse(taskLine));
        }
      } else {
        const taskLine = `${prefix}${statusIcon}${task.name} (${timeDisplay})`;
        if (isRunning) {
          // Running task not selected: bright green text
          console.log(chalk.green.bold(taskLine));
        } else {
          // Regular task
          console.log(taskLine);
        }
      }
    });
    
    console.log('\n' + chalk.gray('Navigation: ↑/↓ to select, Enter to start, Esc/q to exit'));
    
    if (currentRunningTask) {
      console.log(chalk.green(`\nCurrently running: ${currentRunningTask.name}`));
    }
  }

  selectCurrentTask() {
    if (this.selectedIndex < 0 || this.selectedIndex >= this.tasks.length) {
      return;
    }

    const selectedTask = this.tasks[this.selectedIndex];
    
    try {
      if (selectedTask.status === 'running') {
        // If task is already running, pause it
        const updatedTask = taskManager.pauseTask(selectedTask.id);
        const summary = taskManager.getTaskSummary(updatedTask);
        console.log(chalk.yellow(`\n⏸ Paused: ${summary.name} (${summary.totalTime})`));
      } else {
        // Start the task (this will auto-pause any running tasks)
        const updatedTask = taskManager.startTask(selectedTask.id);
        const summary = taskManager.getTaskSummary(updatedTask);
        console.log(chalk.green(`\n✓ Started: ${summary.name}`));
      }
      
      // Refresh tasks list and re-render
      setTimeout(() => {
        this.tasks = taskManager.getTodaysTasks().filter(task => task.status !== 'stopped');
        this.render();
      }, 1000);
      
    } catch (error) {
      console.log(chalk.red(`\n✗ Error: ${error.message}`));
      setTimeout(() => this.render(), 2000);
    }
  }

  startTimer() {
    // Update display every second for running tasks
    this.timerInterval = setInterval(() => {
      if (this.isActive) {
        this.refreshTasksAndRender();
      }
    }, 1000);
  }

  refreshTasksAndRender() {
    // Refresh tasks data to get updated times
    this.tasks = taskManager.getTodaysTasks().filter(task => task.status !== 'stopped');
    
    // Ensure selectedIndex is still valid
    if (this.selectedIndex >= this.tasks.length) {
      this.selectedIndex = Math.max(0, this.tasks.length - 1);
    }
    
    this.render();
  }

  exitToCommandMode() {
    this.isActive = false;
    
    // Clear timer
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    
    // Restore normal mode
    process.stdin.setRawMode(this.originalRawMode || false);
    process.stdin.removeAllListeners('data');
    
    console.clear();
    console.log(chalk.green('Switched to command mode\n'));
    console.log(chalk.gray('Type "help" for commands, "nav" to return to visual mode, or "exit" to quit\n'));
    
    // Show current status
    const taskManager = require('./taskManager');
    const runningTasks = taskManager.getRunningTasks();
    const pausedTasks = taskManager.getPausedTasks();
    
    console.log(chalk.bold('📊 Current Status:'));
    console.log('═'.repeat(40));
    
    if (runningTasks.length > 0) {
      console.log(chalk.green.bold('🟢 Running:'));
      runningTasks.forEach(task => {
        console.log(`  ${chalk.cyan(task.id)}. ${task.name} (${task.totalTime})`);
      });
    }
    
    if (pausedTasks.length > 0) {
      console.log(chalk.yellow.bold('⏸ Paused:'));
      pausedTasks.forEach(task => {
        console.log(`  ${chalk.cyan(task.id)}. ${task.name} (${task.totalTime})`);
      });
    }
    
    if (runningTasks.length === 0 && pausedTasks.length === 0) {
      console.log(chalk.gray('No active tasks'));
    }
    console.log('═'.repeat(40));
    
    // Restart the parent readline interface
    if (this.parentRL) {
      // Create a small delay to ensure clean transition
      setTimeout(() => {
        this.parentRL.prompt();
      }, 100);
    }
  }

  exit() {
    this.isActive = false;
    
    // Clear timer
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    
    // Restore normal mode
    process.stdin.setRawMode(this.originalRawMode || false);
    process.stdin.removeAllListeners('data');
    
    console.clear();
    console.log(chalk.green('Exited visual navigation mode\n'));
    
    // Restart the parent readline interface
    if (this.parentRL) {
      // Create a small delay to ensure clean transition
      setTimeout(() => {
        this.parentRL.prompt();
      }, 100);
    }
  }
}

module.exports = VisualNavigation;