# Local Password Vault - Development Environment

This development environment is configured for secure vendor access to the Local Password Vault codebase.

## Important Security Notes

- This environment is containerized and runs in the cloud
- Code cannot be downloaded or copied outside this environment
- All work must be performed within this secure space
- Access is monitored and logged

## Getting Started

1. The environment will automatically install dependencies when created
2. Start the development server with `npm run dev`
3. For Electron development, use `npm run electron-dev`
4. Test the application with `npm test`

## Environment Configuration

- Node.js 18
- Vite development server
- ESLint and Prettier for code quality
- TypeScript support
- Tailwind CSS tools

## Access Restrictions

- Git operations are restricted
- File downloads are disabled
- Network access is limited to required development services

For any issues or questions, please contact the project administrator.