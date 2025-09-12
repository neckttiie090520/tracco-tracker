# Contributing to Workshop Tracker

Thank you for your interest in contributing to Workshop Tracker! This guide will help you get started.

## 📝 Commit Message Convention

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification for clear, consistent commit messages.

### Format

```
type(scope): description

[optional body]

[optional footer]
```

### Types

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation only changes
- **style**: Changes that do not affect the meaning of the code
- **refactor**: A code change that neither fixes a bug nor adds a feature
- **perf**: A code change that improves performance
- **test**: Adding missing tests or correcting existing tests
- **build**: Changes that affect the build system or external dependencies
- **ci**: Changes to our CI configuration files and scripts
- **chore**: Other changes that don't modify src or test files

### Scopes

- **auth**: Authentication related changes
- **dashboard**: Dashboard functionality
- **tasks**: Task management features
- **submissions**: Submission handling
- **ui**: User interface components
- **api**: API related changes
- **db**: Database changes
- **config**: Configuration changes

### Examples

```bash
# Feature commits
feat(auth): add OAuth login support
feat(tasks): implement group task assignments
feat(ui): add loading states for all CRUD operations

# Bug fix commits
fix(dashboard): resolve loading state issue in admin panel
fix(submissions): correct file upload validation
fix(router): remove nested BrowserRouter to avoid runtime errors

# Performance commits
perf(queries): optimize workshop feed data fetching (70-85% faster)
perf(cache): implement smart caching with React Query
perf(db): add database indexes for faster task queries

# Documentation commits
docs(readme): update installation guide with environment variables
docs(api): add comprehensive API documentation
docs(performance): document optimization strategies

# Refactor commits
refactor(hooks): extract submission operations into dedicated hook
refactor(components): standardize loading button components
refactor(services): reorganize API services for better maintainability
```

## 🔄 Pull Request Process

1. **Create a feature branch**
   ```bash
   git checkout -b feat/amazing-feature
   ```

2. **Make your changes**
   - Follow the existing code style
   - Add TypeScript types for new functionality
   - Include proper error handling
   - Add loading states for async operations

3. **Test your changes**
   ```bash
   npm run test
   npm run type-check
   npm run lint
   ```

4. **Commit with proper message**
   ```bash
   git commit -m "feat(tasks): add real-time task collaboration"
   ```

5. **Push and create PR**
   ```bash
   git push origin feat/amazing-feature
   ```

## 📋 PR Template

When creating a pull request, please use this template:

```markdown
## 🎯 Description
Brief description of what this PR does.

## 🔗 Related Issue
Closes #(issue number)

## 🧪 Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## ✅ Testing
- [ ] Tests pass locally
- [ ] Added tests for new functionality
- [ ] Manual testing completed

## 📷 Screenshots (if applicable)
Add screenshots to help explain your changes.

## 🔍 Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review of code completed
- [ ] Code is commented, particularly in hard-to-understand areas
- [ ] Documentation has been updated
- [ ] Changes generate no new warnings
```

## 🏗 Development Guidelines

### Code Style

- **TypeScript**: Always use proper types, avoid `any`
- **Components**: Use functional components with hooks
- **Hooks**: Extract complex logic into custom hooks
- **Performance**: Consider loading states and error handling
- **Accessibility**: Follow ARIA guidelines

### File Naming

- **Components**: PascalCase (e.g., `TaskSubmissionForm.tsx`)
- **Hooks**: camelCase starting with `use` (e.g., `useTaskManagement.ts`)
- **Services**: camelCase (e.g., `submissionService.ts`)
- **Types**: PascalCase (e.g., `TaskSubmission.ts`)

### Folder Structure

```
src/
├── components/
│   ├── admin/          # Admin-specific components
│   ├── tasks/          # Task-related components  
│   ├── ui/             # Reusable UI components
│   └── user/           # User interface components
├── hooks/              # Custom React hooks
├── services/           # API and business logic
├── types/              # TypeScript type definitions
└── utils/              # Helper functions
```

## 🚨 Important Notes

### Performance Considerations

- Always include loading states for async operations
- Use React Query for server state management
- Implement proper error boundaries
- Consider mobile responsiveness

### Security

- Never commit sensitive information (API keys, passwords)
- Use environment variables for configuration
- Follow Supabase RLS (Row Level Security) patterns
- Validate all user inputs

### Testing

- Write unit tests for utility functions
- Add integration tests for critical flows
- Test error scenarios
- Verify loading states work correctly

## 🐛 Reporting Issues

When reporting bugs, please include:

1. **Environment**: OS, browser, Node.js version
2. **Steps to reproduce**: Clear step-by-step instructions
3. **Expected behavior**: What should happen
4. **Actual behavior**: What actually happens
5. **Screenshots**: If applicable
6. **Console errors**: Any error messages

## 💡 Suggesting Features

For feature requests, please provide:

1. **Problem statement**: What problem does this solve?
2. **Proposed solution**: How should it work?
3. **Alternatives considered**: Other possible approaches
4. **Additional context**: Mockups, examples, etc.

## 🏆 Recognition

Contributors will be recognized in:
- Repository contributors list
- Release notes for significant contributions
- Special mentions for performance improvements

Thank you for contributing to Workshop Tracker! 🎉