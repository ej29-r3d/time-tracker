# Time Tracker CLI - Visual Mode

A visual, real-time time tracking interface with integrated text input.

## Why I Built This
I used to rely on KTimeTracker on my Linux machine - a simple, effective time tracking tool that stayed out of my way. After moving to macOS, I struggled to find something equally minimalistic. 

So I built timet - the time tracker I wished existed.

- It lives in the terminal where I already work
- Starts tracking with a single command
- Has a clean visual mode when needed
- Stays minimal and focused on just tracking time
- Collects logs in the local file on your machine

## Usage

### Start the app:
```bash
timet
```

### Visual Interface:
```
🕒 Time Tracker - Visual Mode
↑/↓ to navigate, Enter to start/pause selected task, type commands below

→ ▶ Current running task (1m 23s)
  ⏸ Another paused task (45m 12s)
  ⏸ Previous task (2h 15m 8s)

Currently running: Current running task

────────────────────────────────────────────────────────────
Commands: start [task name], stop, exit
Or type task name to create and start
────────────────────────────────────────────────────────────
> ▮
```

### Controls:

#### **Arrow Navigation:**
- **↑/↓** - Navigate through tasks
- **Enter** - Start/pause the selected task

#### **Text Commands:**
- **`start`** - Resume last active task  
- **`start task name`** - Start existing task or create new one
- **`stop`** - Pause currently running task
- **`exit`** - Close the app
- **`task name`** - Create and start a new task
- **Backspace** - Delete typed characters
- **Escape** - Clear current input

### Examples:

```bash
# Start the visual interface
timet

# Type in the input area:
> start coding project       # Creates/starts "coding project"
> stop                       # Pauses current running task
> start                      # Resumes last task
> meeting prep               # Creates/starts "meeting prep"
> exit                       # Closes app
```

## Data Storage

All tasks stored in `~/.timetracker-data.json` with:
- Task names, URLs, and status
- Multiple time sessions per task
- Total time calculations
- Today's activity filtering

## Requirements

- Interactive terminal (TTY required)
- Node.js
- Works on macOS, Linux, Windows

Perfect for developers, freelancers, and anyone tracking work time! 🚀
