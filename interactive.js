const readline = require('readline');
const chalk = require('chalk');
const taskManager = require('./taskManager');
const VisualMode = require('./visualMode');

class InteractiveMode {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: chalk.cyan('timet> ')
    });
    
    this.timerInterval = null;
    this.isUserTyping = false;
    this.setupEventListeners();
  }

  setupEventListeners() {
    this.rl.on('line', (input) => {
      this.isUserTyping = false;
      this.handleCommand(input.trim());
    });

    this.rl.on('close', () => {
      if (this.timerInterval) {
        clearInterval(this.timerInterval);
      }
      console.log(chalk.yellow('\nGoodbye! 👋'));
      process.exit(0);
    });
  }

  start() {
    // Start the new integrated visual mode
    const visualMode = new VisualMode();
    const started = visualMode.start();
    
    if (!started) {
      console.log(chalk.red('Visual mode requires an interactive terminal. Exiting...'));
      process.exit(1);
    }
  }

  handleCommand(input) {
    const [command, ...args] = input.split(' ');
    
    try {
      switch (command.toLowerCase()) {
        case 'help':
          this.showHelp();
          break;
        case 'create':
          this.createTask(args.join(' '));
          break;
        case 'list':
          this.listTasks(args[0]);
          break;
        case 'start':
          if (args.length === 0) {
            this.startLastTask();
          } else {
            this.startTask(args.join(' '));
          }
          break;
        case 'pause':
          this.pauseTask(args.join(' '));
          break;
        case 'stop':
          if (args.length === 0) {
            this.stopCurrentTask();
          } else {
            this.stopTask(args.join(' '));
          }
          break;
        case 'unstop':
          this.unstopTask(args.join(' '));
          break;
        case 'status':
          this.showStatus();
          break;
        case 'select':
          this.selectTask();
          break;
        case 'nav':
        case 'navigate':
        case 'visual':
          this.startVisualNavigation();
          break;
        case 'cmd':
        case 'command':
          console.log(chalk.green('Switched to command mode'));
          this.showStatus();
          break;
        case 'exit':
        case 'quit':
          this.rl.close();
          return;
        case '':
          break;
        default:
          console.log(chalk.red(`Unknown command: ${command}`));
          console.log(chalk.gray('Type "help" for available commands'));
      }
    } catch (error) {
      console.log(chalk.red(`✗ Error: ${error.message}`));
    }
    
    this.updatePrompt();
  }

  showHelp() {
    console.log(chalk.bold('\n📋 Available Commands:'));
    console.log('─'.repeat(50));
    console.log(chalk.cyan('create <name>') + '          - Create a new task');
    console.log(chalk.cyan('list [paused|stopped|all]') + ' - List tasks by status');
    console.log(chalk.cyan('start [id|name]') + '        - Start tracking (or resume last task if no args)');
    console.log(chalk.cyan('pause <id|name>') + '        - Pause tracking a task');
    console.log(chalk.cyan('stop [id|name]') + '         - Stop tracking (or stop current task if no args)');
    console.log(chalk.cyan('unstop <id|name>') + '       - Unstop a task');
    console.log(chalk.cyan('status') + '                 - Show current status');
    console.log(chalk.cyan('select') + '                 - Interactive task selection');
    console.log(chalk.cyan('nav/visual') + '             - Visual navigation with arrow keys (default)');
    console.log(chalk.cyan('cmd/command') + '            - Switch to command mode');
    console.log(chalk.cyan('exit') + '                   - Exit interactive mode');
    console.log('─'.repeat(50));
  }

  createTask(input) {
    if (!input) {
      console.log(chalk.red('Please provide a task name'));
      return;
    }
    
    const parts = input.split(' --url ');
    const name = parts[0].trim();
    const url = parts[1] ? parts[1].trim() : '';
    
    const task = taskManager.createTask(name, url);
    console.log(chalk.green(`✓ Task created: "${task.name}" (ID: ${task.id})`));
    if (task.url) {
      console.log(chalk.blue(`  URL: ${task.url}`));
    }
  }

  listTasks(filter = 'all') {
    let tasks = [];
    let title = '';
    
    switch (filter?.toLowerCase()) {
      case 'paused':
        tasks = taskManager.getPausedTasks();
        title = 'Paused Tasks';
        break;
      case 'stopped':
        tasks = taskManager.getStoppedTasks();
        title = 'Stopped Tasks';
        break;
      case 'running':
        tasks = taskManager.getRunningTasks();
        title = 'Running Tasks';
        break;
      default:
        tasks = taskManager.getAllTasksSummary();
        title = 'All Tasks';
    }
    
    if (tasks.length === 0) {
      console.log(chalk.gray(`No ${filter === 'all' ? '' : filter + ' '}tasks found.`));
      return;
    }
    
    console.log(chalk.bold(`\n${title}:`));
    console.log('─'.repeat(60));
    
    tasks.forEach(task => {
      const statusColor = task.status === 'running' ? 'green' : 
                         task.status === 'paused' ? 'yellow' : 
                         task.status === 'stopped' ? 'red' : 'gray';
      
      console.log(`${chalk.cyan(task.id)}. ${chalk.bold(task.name)} ${chalk[statusColor](`[${task.status}]`)}`);
      console.log(`   Time: ${task.totalTime} | Sessions: ${task.sessionCount}`);
      if (task.url) {
        console.log(`   URL: ${chalk.blue(task.url)}`);
      }
    });
    console.log('─'.repeat(60));
  }

  findTask(input) {
    const tasks = taskManager.getAllTasksSummary().filter(task => task.status !== 'stopped');
    
    if (/^\d+$/.test(input)) {
      return tasks.find(task => task.id === parseInt(input));
    }
    
    const lowercaseInput = input.toLowerCase();
    return tasks.find(task => 
      task.name.toLowerCase().includes(lowercaseInput) ||
      task.name.toLowerCase() === lowercaseInput
    );
  }

  startTask(input) {
    if (!input) {
      console.log(chalk.red('Please provide a task ID or name'));
      return;
    }
    
    let task = this.findTask(input);
    
    if (!task) {
      // Check if input is a number (ID) - if so, don't create a new task
      if (/^\d+$/.test(input)) {
        console.log(chalk.red(`Task with ID ${input} not found`));
        console.log(chalk.gray('Use "list" to see available tasks'));
        return;
      }
      
      // Create a new task with the given name
      console.log(chalk.blue(`Creating new task: "${input}"`));
      const newTask = taskManager.createTask(input);
      task = taskManager.getTaskSummary(newTask);
    }
    
    const updatedTask = taskManager.startTask(task.id);
    const summary = taskManager.getTaskSummary(updatedTask);
    console.log(chalk.green(`✓ Started: ${summary.name}`));
  }

  pauseTask(input) {
    if (!input) {
      console.log(chalk.red('Please provide a task ID or name'));
      return;
    }
    
    const task = this.findTask(input);
    if (!task) {
      console.log(chalk.red(`Task not found: ${input}`));
      return;
    }
    
    const updatedTask = taskManager.pauseTask(task.id);
    const summary = taskManager.getTaskSummary(updatedTask);
    console.log(chalk.yellow(`⏸ Paused: ${summary.name} (${summary.totalTime})`));
  }

  stopTask(input) {
    if (!input) {
      console.log(chalk.red('Please provide a task ID or name'));
      return;
    }
    
    const task = this.findTask(input);
    if (!task) {
      console.log(chalk.red(`Task not found: ${input}`));
      return;
    }
    
    const updatedTask = taskManager.stopTask(task.id);
    const summary = taskManager.getTaskSummary(updatedTask);
    console.log(chalk.red(`⏹ Stopped: ${summary.name} (${summary.totalTime})`));
  }

  unstopTask(input) {
    if (!input) {
      console.log(chalk.red('Please provide a task ID or name'));
      return;
    }
    
    const task = this.findTask(input);
    if (!task) {
      console.log(chalk.red(`Task not found: ${input}`));
      return;
    }
    
    const updatedTask = taskManager.unstopTask(task.id);
    const summary = taskManager.getTaskSummary(updatedTask);
    console.log(chalk.green(`✓ Unstopped: ${summary.name}`));
  }

  showStatus() {
    const runningTasks = taskManager.getRunningTasks();
    const pausedTasks = taskManager.getPausedTasks();
    
    console.log(chalk.bold('\n📊 Current Status:'));
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
  }

  async selectTask() {
    const tasks = taskManager.getAllTasksSummary().filter(task => task.status !== 'stopped');
    
    if (tasks.length === 0) {
      console.log(chalk.gray('No active tasks available. Create one first!'));
      return;
    }
    
    console.log(chalk.bold('\n📋 Select a task:'));
    console.log('─'.repeat(50));
    
    tasks.forEach((task, index) => {
      const statusColor = task.status === 'running' ? 'green' : 
                         task.status === 'paused' ? 'yellow' : 
                         task.status === 'stopped' ? 'red' : 'gray';
      
      console.log(`${chalk.cyan(index + 1)}. ${task.name} ${chalk[statusColor](`[${task.status}]`)}`);
      console.log(`   Time: ${task.totalTime}`);
    });
    
    console.log('─'.repeat(50));
    console.log(chalk.gray('Enter task number, or press Enter to cancel:'));
    
    this.rl.question('> ', (answer) => {
      if (!answer.trim()) {
        console.log(chalk.gray('Selection cancelled'));
        this.rl.prompt();
        return;
      }
      
      const taskIndex = parseInt(answer) - 1;
      if (taskIndex >= 0 && taskIndex < tasks.length) {
        const selectedTask = tasks[taskIndex];
        this.showTaskActions(selectedTask);
      } else {
        console.log(chalk.red('Invalid task number'));
        this.rl.prompt();
      }
    });
  }

  showTaskActions(task) {
    console.log(chalk.bold(`\n📝 Task: ${task.name}`));
    console.log(`Status: ${chalk.yellow(task.status)} | Time: ${task.totalTime}`);
    
    const availableActions = [];
    
    if (task.status === 'created' || task.status === 'paused') {
      availableActions.push('1. Start');
    }
    if (task.status === 'running') {
      availableActions.push('2. Pause');
    }
    if (task.status === 'running' || task.status === 'paused') {
      availableActions.push('3. Stop');
    }
    if (task.status === 'stopped') {
      availableActions.push('4. Unstop');
    }
    
    console.log('\nAvailable actions:');
    availableActions.forEach(action => console.log(action));
    console.log('Press Enter to cancel');
    
    this.rl.question('> ', (answer) => {
      const action = parseInt(answer);
      
      try {
        switch (action) {
          case 1:
            if (task.status === 'created' || task.status === 'paused') {
              this.startTask(task.id.toString());
            }
            break;
          case 2:
            if (task.status === 'running') {
              this.pauseTask(task.id.toString());
            }
            break;
          case 3:
            if (task.status === 'running' || task.status === 'paused') {
              this.stopTask(task.id.toString());
            }
            break;
          case 4:
            if (task.status === 'stopped') {
              this.unstopTask(task.id.toString());
            }
            break;
          default:
            console.log(chalk.gray('Action cancelled'));
        }
      } catch (error) {
        console.log(chalk.red(`Error: ${error.message}`));
      }
      
      this.rl.prompt();
    });
  }

  startTimer() {
    // Update prompt every 10 seconds instead of every second to avoid interference
    this.timerInterval = setInterval(() => {
      this.updatePromptSilently();
    }, 10000);
  }

  updatePromptSilently() {
    const runningTask = taskManager.getCurrentRunningTask();
    
    if (runningTask) {
      const currentTime = taskManager.getCurrentRunningTime(runningTask);
      const timeStr = taskManager.formatDuration(currentTime);
      this.rl.setPrompt(chalk.cyan(`timet [${runningTask.name}: ${timeStr}]> `));
    } else {
      this.rl.setPrompt(chalk.cyan('timet> '));
    }
    
    // Don't call prompt() to avoid cursor interference
  }

  updatePrompt() {
    const runningTask = taskManager.getCurrentRunningTask();
    
    if (runningTask) {
      const currentTime = taskManager.getCurrentRunningTime(runningTask);
      const timeStr = taskManager.formatDuration(currentTime);
      this.rl.setPrompt(chalk.cyan(`timet [${runningTask.name}: ${timeStr}]> `));
    } else {
      this.rl.setPrompt(chalk.cyan('timet> '));
    }
    
    this.rl.prompt();
  }

  startLastTask() {
    const lastTask = taskManager.getLastActiveTask();
    if (!lastTask) {
      console.log(chalk.yellow('No previous task found. Please specify a task name or ID.'));
      return;
    }
    
    if (lastTask.status === 'stopped') {
      console.log(chalk.yellow(`Last task "${lastTask.name}" is stopped. Use "unstop ${lastTask.id}" first or specify a different task.`));
      return;
    }
    
    const updatedTask = taskManager.startTask(lastTask.id);
    const summary = taskManager.getTaskSummary(updatedTask);
    console.log(chalk.green(`✓ Resumed: ${summary.name}`));
  }

  stopCurrentTask() {
    const runningTask = taskManager.getCurrentRunningTask();
    if (!runningTask) {
      console.log(chalk.yellow('No task is currently running.'));
      return;
    }
    
    const updatedTask = taskManager.pauseTask(runningTask.id);
    const summary = taskManager.getTaskSummary(updatedTask);
    console.log(chalk.yellow(`⏸ Paused: ${summary.name} (${summary.totalTime})`));
  }

  startVisualNavigation() {
    const visualNav = new VisualNavigation(this.rl);
    const started = visualNav.start();
    
    if (!started) {
      // If visual nav couldn't start, return to normal prompt
      this.updatePrompt();
    }
    
    return started;
  }
}

module.exports = InteractiveMode;