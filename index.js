#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('chalk');
const taskManager = require('./taskManager');
const InteractiveMode = require('./interactive');

const program = new Command();

program
  .name('timetrack')
  .description('CLI tool for tracking time on tasks')
  .version('1.0.0');

program
  .command('interactive')
  .alias('i')
  .description('Start interactive mode')
  .action(() => {
    const interactive = new InteractiveMode();
    interactive.start();
  });

program
  .command('create')
  .description('Create a new task')
  .argument('<name>', 'task name')
  .option('-u, --url <url>', 'task URL')
  .action((name, options) => {
    try {
      const task = taskManager.createTask(name, options.url || '');
      console.log(chalk.green(`✓ Task created successfully!`));
      console.log(`ID: ${task.id}`);
      console.log(`Name: ${task.name}`);
      if (task.url) {
        console.log(`URL: ${task.url}`);
      }
      console.log(`Status: ${task.status}`);
    } catch (error) {
      console.log(chalk.red(`✗ Error: ${error.message}`));
    }
  });

program
  .command('start')
  .description('Start time tracking for a task')
  .argument('<id>', 'task ID')
  .action((id) => {
    try {
      const task = taskManager.startTask(id);
      const summary = taskManager.getTaskSummary(task);
      console.log(chalk.green(`✓ Started tracking time for task: ${summary.name}`));
      console.log(`Status: ${chalk.yellow(summary.status)}`);
    } catch (error) {
      console.log(chalk.red(`✗ Error: ${error.message}`));
    }
  });

program
  .command('pause')
  .description('Pause time tracking for a task')
  .argument('<id>', 'task ID')
  .action((id) => {
    try {
      const task = taskManager.pauseTask(id);
      const summary = taskManager.getTaskSummary(task);
      console.log(chalk.yellow(`⏸ Paused tracking time for task: ${summary.name}`));
      console.log(`Total time: ${summary.totalTime}`);
      console.log(`Status: ${chalk.yellow(summary.status)}`);
    } catch (error) {
      console.log(chalk.red(`✗ Error: ${error.message}`));
    }
  });

program
  .command('stop')
  .description('Stop time tracking for a task')
  .argument('<id>', 'task ID')
  .action((id) => {
    try {
      const task = taskManager.stopTask(id);
      const summary = taskManager.getTaskSummary(task);
      console.log(chalk.red(`⏹ Stopped tracking time for task: ${summary.name}`));
      console.log(`Total time: ${summary.totalTime}`);
      console.log(`Status: ${chalk.red(summary.status)}`);
    } catch (error) {
      console.log(chalk.red(`✗ Error: ${error.message}`));
    }
  });

program
  .command('unstop')
  .description('Unstop a task and return it to paused state')
  .argument('<id>', 'task ID')
  .action((id) => {
    try {
      const task = taskManager.unstopTask(id);
      const summary = taskManager.getTaskSummary(task);
      console.log(chalk.green(`✓ Unstopped task: ${summary.name}`));
      console.log(`Status: ${chalk.yellow(summary.status)}`);
    } catch (error) {
      console.log(chalk.red(`✗ Error: ${error.message}`));
    }
  });

program
  .command('list')
  .description('List tasks')
  .option('-p, --paused', 'show only paused tasks')
  .option('-s, --stopped', 'show only stopped tasks')
  .option('-r, --running', 'show only running tasks')
  .option('-a, --all', 'show all tasks')
  .action((options) => {
    try {
      let tasks = [];
      let title = '';
      
      if (options.paused) {
        tasks = taskManager.getPausedTasks();
        title = 'Paused Tasks';
      } else if (options.stopped) {
        tasks = taskManager.getStoppedTasks();
        title = 'Stopped Tasks';
      } else if (options.running) {
        tasks = taskManager.getRunningTasks();
        title = 'Running Tasks';
      } else {
        tasks = taskManager.getAllTasksSummary();
        title = 'All Tasks';
      }
      
      if (tasks.length === 0) {
        console.log(chalk.gray(`No tasks found.`));
        return;
      }
      
      console.log(chalk.bold(`\n${title}:`));
      console.log('─'.repeat(60));
      
      tasks.forEach(task => {
        const statusColor = task.status === 'running' ? 'green' : 
                           task.status === 'paused' ? 'yellow' : 'red';
        
        console.log(`ID: ${chalk.cyan(task.id)} | ${chalk.bold(task.name)}`);
        console.log(`Status: ${chalk[statusColor](task.status)} | Time: ${task.totalTime}`);
        if (task.url) {
          console.log(`URL: ${chalk.blue(task.url)}`);
        }
        console.log(`Sessions: ${task.sessionCount} | Created: ${new Date(task.createdAt).toLocaleDateString()}`);
        console.log('─'.repeat(60));
      });
    } catch (error) {
      console.log(chalk.red(`✗ Error: ${error.message}`));
    }
  });

program
  .command('status')
  .description('Show current status of all active tasks')
  .action(() => {
    try {
      const runningTasks = taskManager.getRunningTasks();
      const pausedTasks = taskManager.getPausedTasks();
      
      console.log(chalk.bold('\n📊 Current Status:'));
      console.log('═'.repeat(50));
      
      if (runningTasks.length > 0) {
        console.log(chalk.green.bold('\n🟢 Currently Running:'));
        runningTasks.forEach(task => {
          console.log(`  ${chalk.cyan(task.id)}: ${task.name} (${task.totalTime})`);
        });
      }
      
      if (pausedTasks.length > 0) {
        console.log(chalk.yellow.bold('\n⏸ Paused:'));
        pausedTasks.forEach(task => {
          console.log(`  ${chalk.cyan(task.id)}: ${task.name} (${task.totalTime})`);
        });
      }
      
      if (runningTasks.length === 0 && pausedTasks.length === 0) {
        console.log(chalk.gray('\nNo active tasks. Use "timetrack create <name>" to get started!'));
      }
    } catch (error) {
      console.log(chalk.red(`✗ Error: ${error.message}`));
    }
  });

if (process.argv.length === 2) {
  if (!process.stdin.isTTY) {
    console.log(chalk.red('Time tracker requires an interactive terminal. Use specific commands instead.'));
    console.log(chalk.gray('Example: timet create "task name" or timet start 1'));
    process.exit(1);
  }
  
  const interactive = new InteractiveMode();
  interactive.start();
} else {
  program.parse();
}