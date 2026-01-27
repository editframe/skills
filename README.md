# Editframe Skills

Agent Skills for video composition with Editframe Elements.

## Installation

### Cursor

Add to your project's `.cursor/skills/` directory:

```bash
cp -r skills/elements-composition .cursor/skills/
cp -r skills/react-composition .cursor/skills/
```

### Claude Code

```bash
/plugin marketplace add editframe/skills
```

### Manual

Copy the skill folders to your agent's skills directory:
- `skills/elements-composition/` - HTML/Web Components
- `skills/react-composition/` - React Components

## Available Skills

- **elements-composition** - Create video compositions with Editframe Elements (HTML/Web Components)
- **react-composition** - Create video compositions with @editframe/react React wrappers (React/TypeScript)

## License

MIT
