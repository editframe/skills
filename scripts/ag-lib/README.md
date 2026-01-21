# AG - Agent Coordination CLI

A simple CLI tool for coordinating autonomous coding agents.

## Quick Start

### Interactive Planning

```bash
./scripts/ag plan
```

Starts an interactive conversation with a planning agent. The agent will:
- Help you create plan documents
- Break down goals into actionable plans
- Mark plans as ready for workers

### Worker Loop

```bash
./scripts/ag work
```

Starts a worker agent that:
- Continuously pulls ready plan documents
- Executes them using cursor agent
- Marks them as complete
- Stops when all work is done or no plans available

### Multiple Workers

Run multiple instances in separate terminals:

```bash
# Terminal 1
./scripts/ag work

# Terminal 2
./scripts/ag work

# Terminal 3
./scripts/ag work
```

Each worker independently claims and executes plans.

## How It Works

1. **Planning**: Run `ag plan` to interactively create plan documents
2. **Execution**: Run `ag work` to start workers that pull and execute plans
3. **Database**: All coordination happens via SQLite database (`.ag/agent.db`)
4. **No Context Pollution**: Sub-agents write to database, parent agents read structured outputs

## Commands

- `ag plan` - Start interactive planning session
- `ag work` - Start worker loop
- `ag queue list` - List plan queues
- `ag status queue <queue-id>` - Check if work is done

## Example Workflow

```bash
# 1. Start planning
./scripts/ag plan
# Agent: "What would you like to plan?"
# You: "I want to migrate authentication from JWT to OAuth2"
# Agent creates plan documents, marks them ready

# 2. Start workers (in separate terminals)
./scripts/ag work
# Workers automatically claim and execute plans

# 3. Check status
./scripts/ag status queue <queue-id>
```
