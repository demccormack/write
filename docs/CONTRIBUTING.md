# Contributing

Thank you for your interest in contributing to Write! This guide will help you get started with development.

## Project Structure

```
write/
├── src/                   # Source code
│   └── index.js           # Entry point
├── test/                  # Test files
│   └── index.test.js      # Main tests
├── docs/                  # Documentation
├── dist/                  # Compiled output (generated)
├── .vscode/               # VS Code settings
├── eslint.config.mts      # ESLint configuration
├── tsconfig.json          # TypeScript configuration
├── .prettierrc.json       # Prettier configuration
├── .nvmrc                 # Node.js version lock
└── package.json           # Project configuration
```

## Available Scripts

- `npm start` - Run the application
- `npm run dev` - Run in development mode with file watching
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run build` - Build TypeScript to JavaScript
- `npm run typecheck` - Type check without building
- `npm run lint` - Lint code
- `npm run lint:fix` - Lint and auto-fix issues
- `npm run format` - Format code with Prettier

## Development Setup

You can use any IDE you like. However if you use Visual Studio Code, you'll find it's already configured with settings to make life easy for you.

1. Ensure you have Node.js v24.6.0 installed (use `nvm use` if you have nvm)
2. Install dependencies: `npm install`
3. Start development: `npm run dev`
4. Run tests: `npm test`

## Code Quality

This project uses:

- **ESLint** for code linting
- **Prettier** for code formatting
- **TypeScript** for type checking
- **Node.js built-in test runner** for testing

## Contributing Guidelines

### Before You Start

1. Fork the repository
2. Clone your fork: `git clone https://github.com/yourusername/write.git`
3. Follow the development setup above

### Making Changes

1. Create a new branch: `git checkout -b feature/your-feature-name`
2. Make your changes
3. Run tests: `npm test`
4. Run linting: `npm run lint`
5. Format code: `npm run format`
6. Commit your changes: `git commit -m "Add your feature"`
7. Push to your fork: `git push origin feature/your-feature-name`
8. Create a pull request

### Pull Request Guidelines

- Write clear, descriptive commit messages
- Include tests for new features
- Ensure all existing tests pass
- Update documentation if needed
- Follow the existing code style

### Reporting Issues

When reporting issues, please include:

- Node.js version
- Operating system
- Steps to reproduce
- Expected vs actual behavior
