# Copilot Rules

## Code Quality Standards

### TypeScript Requirements
- **Strict Mode**: All code must pass TypeScript strict mode compilation
- **No Explicit Any**: Avoid `any` types - use proper interfaces, `unknown`, or generics
- **Interface First**: Define interfaces before implementation for complex objects
- **Type Guards**: Use proper type guards for runtime type checking
- **Import Types**: Use `import type` for type-only imports to optimize bundles

### Code Style Guidelines
- **ESLint Compliance**: All code must pass ESLint checks without warnings
- **Prettier Formatting**: Consistent code formatting throughout codebase
- **Naming Conventions**: 
  - PascalCase for components and types
  - camelCase for functions and variables
  - SCREAMING_SNAKE_CASE for constants
- **File Organization**: Group related functionality, separate concerns clearly

### React Best Practices
- **Functional Components**: Prefer function components over class components
- **Hooks Usage**: Follow hooks rules, use custom hooks for reusable logic
- **Props Interface**: Always define prop interfaces for components
- **Error Boundaries**: Implement for critical component trees
- **Performance**: Use React.memo, useMemo, useCallback judiciously

## Architecture Principles

### Service Layer Architecture
- **Single Responsibility**: Each service has one clear purpose
- **Interface-Based**: All services implement well-defined interfaces
- **Error Handling**: Comprehensive error handling with structured responses
- **Testing**: Services must have unit tests with >80% coverage
- **Immutability**: Prefer immutable data structures and pure functions

### Component Architecture
- **Composition**: Favor composition over inheritance
- **Reusability**: Components should be reusable across different contexts
- **Props Interface**: Clear, documented prop interfaces
- **State Management**: Use appropriate state management (local vs global)
- **Performance**: Optimize rendering with proper dependencies

### API Design Principles
- **RESTful Routes**: Follow RESTful conventions for API endpoints
- **Structured Responses**: Consistent response format with error handling
- **Type Safety**: Request/response types defined and validated
- **Error Codes**: Meaningful HTTP status codes and error messages
- **Documentation**: API endpoints documented with examples

## ChatKit Integration Standards

### Component Integration
- **Official Types**: Use @openai/chatkit types exclusively
- **Fallback Strategy**: Always provide fallback to OmniBox
- **Error Boundaries**: Wrap ChatKit components in error boundaries
- **Theme Sync**: Maintain MUI theme synchronization
- **Performance**: Monitor ChatKit loading and rendering performance

### Widget Development
- **Type Safety**: Use official Widgets types from @openai/chatkit
- **Action Validation**: Validate all widget actions before processing
- **Accessibility**: Ensure widgets meet accessibility standards
- **Responsive Design**: Widgets must work across device sizes
- **Error States**: Handle widget errors gracefully

### Message Processing
- **Input Sanitization**: Sanitize all user inputs before processing
- **Intent Detection**: Proper intent classification for all message types
- **Context Management**: Maintain conversation context appropriately
- **Response Validation**: Validate AI responses before displaying
- **Caching**: Cache appropriate responses for performance

## Testing Requirements

### Unit Testing
- **Coverage Target**: Minimum 80% code coverage for services and components
- **Mock Strategy**: Use proper mocking for external dependencies
- **Test Isolation**: Each test should be independent and repeatable
- **Assertions**: Clear, specific assertions with meaningful error messages
- **Edge Cases**: Test error conditions and edge cases

### Integration Testing
- **API Testing**: Test all API endpoints with realistic data
- **Component Integration**: Test component interactions and data flow
- **Service Integration**: Test service layer with actual dependencies
- **Error Scenarios**: Test error handling and recovery mechanisms
- **Performance**: Include performance assertions for critical paths

### End-to-End Testing
- **User Journeys**: Test complete user workflows
- **Cross-Browser**: Ensure compatibility across browsers
- **Responsive Testing**: Test across device sizes and orientations
- **Accessibility**: Validate WCAG compliance
- **Performance**: Monitor real-world performance metrics

## Security Guidelines

### Input Validation
- **Sanitization**: All user inputs must be sanitized
- **Validation**: Use schema validation (Zod) for all API inputs
- **XSS Prevention**: Prevent cross-site scripting attacks
- **SQL Injection**: Though not using SQL, validate all data queries
- **Rate Limiting**: Implement appropriate rate limiting

### API Security
- **Authentication**: Validate API keys and user sessions
- **Authorization**: Check permissions for all operations
- **CORS**: Configure CORS appropriately for production
- **Headers**: Use security headers (CSP, HSTS, etc.)
- **Logging**: Log security events without exposing sensitive data

### Data Protection
- **PII Handling**: Identify and protect personally identifiable information
- **Secrets Management**: Never commit secrets to version control
- **Environment Variables**: Use env vars for configuration
- **Audit Logging**: Log important user actions and system events
- **Data Minimization**: Only collect and store necessary data

## Performance Standards

### Frontend Performance
- **First Load**: Target <3s initial page load
- **Search Response**: <1s for search queries (p95)
- **ChatKit Loading**: <2s for ChatKit initialization
- **Bundle Size**: Monitor and optimize bundle sizes
- **Memory Usage**: Prevent memory leaks in long-running sessions

### Backend Performance
- **API Response**: <500ms for standard API calls (p95)
- **Search Index**: In-memory caching for sub-second search
- **Export Generation**: <5s for PDF generation (p95)
- **Caching Strategy**: Implement appropriate caching layers
- **Resource Usage**: Monitor CPU and memory usage

### Optimization Techniques
- **Code Splitting**: Lazy load non-critical components
- **Caching**: Implement multi-layer caching strategy
- **Virtualization**: Use virtual scrolling for large lists
- **Debouncing**: Debounce expensive operations appropriately
- **Compression**: Enable compression for API responses

## Error Handling Standards

### User-Facing Errors
- **Graceful Degradation**: System should degrade gracefully on errors
- **User Messages**: Clear, actionable error messages for users
- **Recovery Options**: Provide recovery options where possible
- **Loading States**: Show appropriate loading and error states
- **Retry Mechanisms**: Implement retry for transient failures

### System Errors
- **Error Boundaries**: Catch and handle React component errors
- **API Errors**: Structured error responses with proper HTTP codes
- **Logging**: Comprehensive error logging without exposing sensitive data
- **Monitoring**: Error tracking and alerting in production
- **Fallbacks**: Fallback mechanisms for external service failures

### Development Errors
- **Type Safety**: Use TypeScript to catch errors at compile time
- **Linting**: Use ESLint to catch common programming errors
- **Testing**: Comprehensive test coverage to catch regressions
- **Code Review**: Peer review for all code changes
- **Documentation**: Document error scenarios and handling

## Documentation Requirements

### Code Documentation
- **TypeScript Types**: Self-documenting code through proper typing
- **JSDoc Comments**: Document complex functions and interfaces
- **README Files**: Clear setup and usage instructions
- **Architecture Docs**: High-level system architecture documentation
- **API Documentation**: Document all API endpoints with examples

### User Documentation
- **User Guides**: Clear instructions for end users
- **Feature Documentation**: Document new features and capabilities
- **Troubleshooting**: Common issues and solutions
- **Performance Tips**: Guidance for optimal usage
- **Migration Guides**: When making breaking changes

### Development Documentation
- **Setup Instructions**: Complete development environment setup
- **Contributing Guidelines**: How to contribute to the project
- **Testing Guidelines**: How to run and write tests
- **Deployment Process**: Production deployment procedures
- **Monitoring and Maintenance**: Operational procedures