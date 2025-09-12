# 🤝 Contributing to Workshop Tracker

Thank you for your interest in contributing to Workshop Tracker! This guide will help you get started.

## 🚀 Quick Start

1. **Fork the repository** and clone your fork
2. **Install dependencies**: `npm install`
3. **Create a feature branch**: `git checkout -b feat/amazing-feature`
4. **Make your changes** following our guidelines below
5. **Test your changes**: `npm run test && npm run type-check`
6. **Commit**: Follow our [commit convention](#commit-convention)
7. **Push and create PR**: Use our [PR template](#pull-request-template)

## 📝 Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

### Format
```
type(scope): description
```

### Types
- `feat`: New feature
- `fix`: Bug fix  
- `docs`: Documentation
- `perf`: Performance improvement
- `refactor`: Code restructuring
- `style`: UI/UX changes
- `test`: Testing changes

### Examples
```bash
feat(auth): add OAuth login support
fix(dashboard): resolve loading state issue
perf(queries): optimize workshop feed (70-85% faster)
docs(readme): update installation guide
```

## 🧪 Testing

```bash
npm run test        # Run unit tests
npm run test:e2e    # Run e2e tests
npm run type-check  # TypeScript check
npm run lint        # ESLint
```

## 📋 Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature  
- [ ] Performance improvement
- [ ] Documentation update

## Testing
- [ ] Tests pass locally
- [ ] Added tests for new functionality
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
```

## 🏗 Development Guidelines

- **TypeScript**: Always use proper types
- **Components**: Functional components with hooks
- **Performance**: Include loading states
- **Accessibility**: Follow ARIA guidelines

For detailed guidelines, see [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md).

---

**Questions?** Open an issue or start a discussion!

Thank you for contributing! 🎉