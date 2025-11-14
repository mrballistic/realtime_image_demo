# Memory Bank Instructions

## Purpose
The memory bank stores critical project context, patterns, and decisions to maintain consistency across development sessions. Each file serves a specific role in preserving institutional knowledge.

## File Structure

### Core Files
- `activeContext.md` - Current project state, active features, and immediate tasks
- `progress.md` - Implementation timeline, completed features, and sprint status
- `architecture.md` - System design, technology choices, and integration patterns
- `copilot-rules.md` - Code quality standards and development guidelines

### Reference Files
- `mui-grid-v7-reference.md` - MUI Grid v7 API migration guide
- `openai-realtime-api.md` - OpenAI Realtime API patterns and event handling
- `webrtc-patterns.md` - WebRTC implementation patterns for browser integration

## Usage Guidelines

1. **Read First**: Always read memory bank files before starting any task
2. **Update Frequently**: Update relevant files when implementing new features
3. **Context Preservation**: Capture architectural decisions and their rationale
4. **Code Patterns**: Document reusable patterns and component structures
5. **Integration Points**: Record third-party service integration details

## Refresh Protocol

When prompted to "update memory bank" or "refresh activeContext.md":
1. Review current project state
2. Update progress.md with completed tasks
3. Update activeContext.md with current focus areas
4. Document any new patterns or decisions
5. Ensure architecture.md reflects current system design