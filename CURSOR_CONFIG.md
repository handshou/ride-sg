# Cursor Configuration for Automatic Build Checking

## 🎯 Overview
This guide helps you configure Cursor to automatically check for build issues on every completed prompt.

## 🔧 Configuration Methods

### 1. **Cursor Rules (.cursorrules)**
The `.cursorrules` file I created will:
- ✅ Automatically run `npm run lint` after changes
- ✅ Check for TypeScript errors with `npm run build`
- ✅ Use `read_lints` tool before completing tasks
- ✅ Fix TypeScript compilation errors immediately

### 2. **VS Code Settings (.vscode/settings.json)**
Configured settings for:
- ✅ Auto-format on save
- ✅ Auto-organize imports
- ✅ TypeScript error checking
- ✅ Biome integration

### 3. **Enhanced Package Scripts**
New scripts available:
```bash
npm run type-check    # TypeScript type checking only
npm run check-all     # Lint + Type check + Build
npm run pre-commit    # Full check before commit
```

### 4. **Git Hooks**
Pre-commit hook will automatically run `npm run check-all` before each commit.

## 🚀 How to Enable Automatic Checking

### Option A: Cursor AI Agent Instructions
Add this to your Cursor AI agent instructions:

```
ALWAYS run these commands after making code changes:
1. read_lints (check for linting errors)
2. npm run type-check (check TypeScript errors)
3. npm run build (verify build works)

Fix any errors before marking tasks as complete.
```

### Option B: Cursor Settings
In Cursor settings, enable:
- **Auto-save on focus change**
- **Format on save**
- **TypeScript error checking**
- **Biome integration**

### Option C: Manual Workflow
After each coding session, run:
```bash
pnpm run check-all
```

## 🛠️ Troubleshooting

### If Build Issues Persist:
1. **Check TypeScript errors**: `pnpm run type-check`
2. **Check linting errors**: `pnpm run lint`
3. **Check build errors**: `pnpm run build`
4. **Fix imports**: Ensure all imports are correct
5. **Check Effect-TS patterns**: Follow established service patterns

### Common Issues:
- **Import errors**: Use relative imports for local files
- **Type errors**: Ensure all types are properly defined
- **Effect errors**: Use proper Effect.catchAll for error handling
- **Service errors**: Follow the established service layer pattern

## 📋 Checklist for Every Code Change

- [ ] Run `read_lints` to check for linting errors
- [ ] Run `pnpm run type-check` for TypeScript errors
- [ ] Run `pnpm run build` to verify build works
- [ ] Fix any errors found
- [ ] Ensure Effect-TS patterns are followed
- [ ] Verify service layer integration
- [ ] Check for proper error handling

## 🎯 Best Practices

1. **Always check before completing**: Use the tools to verify code quality
2. **Fix errors immediately**: Don't leave TypeScript or linting errors
3. **Follow patterns**: Use established Effect-TS and service patterns
4. **Test builds**: Ensure the application builds successfully
5. **Maintain quality**: Keep code clean and well-structured

## 🔄 Automatic Workflow

With this configuration, Cursor will:
1. **Detect changes** in your code
2. **Run linting** automatically
3. **Check TypeScript** compilation
4. **Verify builds** work
5. **Report issues** if any are found
6. **Suggest fixes** for common problems

This ensures your code is always in a buildable state!
