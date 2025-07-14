# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

```bash
# Development
npm install              # Install dependencies
npm run build           # Build all distributions (ES, CJS, UMD)
npm run build:types     # Generate TypeScript declaration files
npm run dev             # Watch mode build with hot reload

# Testing & Quality
npm test                # Run Jest tests
npm run test:watch      # Run tests in watch mode
npm run lint            # Lint TypeScript files with ESLint
npm run lint:fix        # Auto-fix ESLint issues

# Maintenance
npm run clean           # Remove dist/ directory
npm run prepublishOnly  # Clean and build for publishing
```

## Project Architecture

### Core Design Patterns

This is a **Firebase-compatible SDK** for BaseBase server with two operational modes:

1. **Auto-initializing Singleton Pattern** (Primary) - For most applications
   - Zero-configuration setup for browser apps
   - Automatic token management after authentication
   - Environment variable detection
   - Ready-to-use functions: `doc()`, `getDoc()`, `setDoc()`, etc.

2. **Manual App Management Pattern** (Advanced) - For multi-tenant scenarios
   - Explicit app initialization: `initializeApp()`, `getBasebase()`
   - Multiple concurrent BaseBase instances
   - Full control over configuration

### Module Structure

- **`src/index.ts`** - Main export hub with comprehensive API surface
- **`src/singleton.ts`** - Auto-initializing singleton with smart configuration detection
- **`src/convenience.ts`** - Zero-setup functions that wrap singleton instance
- **`src/auth.ts`** - Phone verification authentication with JWT token management
- **`src/app.ts`** - Manual app management for advanced use cases
- **`src/document.ts`** - Core document CRUD operations
- **`src/query.ts`** - Firestore-compatible querying (where, orderBy, limit)
- **`src/types.ts`** - Complete TypeScript definitions with Firebase compatibility
- **`src/utils.ts`** - Data transformation and HTTP utilities

### Build System

**Rollup Configuration** produces multiple output formats:
- ES Modules (`dist/index.esm.js`) - For modern bundlers
- CommonJS (`dist/index.cjs`) - For Node.js
- UMD (`dist/index.umd.js`) - For script tag usage
- TypeScript declarations (`dist/index.d.ts`) - Full type support
- Separate auth module builds (`auth.esm.js`, `auth.cjs`)

**External Dependencies**: Only `js-cookie` for browser token persistence

### Authentication Architecture

**Phone Verification Flow**:
1. `requestCode(name, phone)` - SMS verification request
2. `verifyCode(phone, code, apiKey)` - Verification and JWT token acquisition
3. Automatic token storage in cookies and localStorage
4. Token auto-injection in subsequent API calls

**Environment Compatibility**:
- **Browser**: Automatic token persistence via cookies/localStorage
- **Server**: Manual configuration required via `configureSingletonBasebase()`

### Data Model

**Firebase-Compatible API**:
- Document references: `doc("users/user123")`
- Collection references: `collection("users")`
- Queries: `query(collection("users"), where("age", ">=", 18), orderBy("name"))`
- Operations: `getDoc()`, `setDoc()`, `updateDoc()`, `deleteDoc()`, `addDoc()`

**Cross-Project Support**: Optional `projectName` parameter for multi-project data access

### Key Implementation Details

**Singleton Proxy Pattern**: The `basebase` export uses a Proxy to lazily initialize the singleton instance only when accessed, enabling immediate usage without explicit setup.

**Smart Configuration Detection**: Environment variables are checked in this order:
1. Standard: `BASEBASE_API_KEY`
2. Vite: `VITE_BASEBASE_API_KEY` 
3. React: `REACT_APP_BASEBASE_API_KEY`
4. Import meta: `import.meta.env`

**Type Safety**: Full TypeScript coverage with Firestore-compatible interfaces, enabling drop-in replacement for Firebase projects.

**Flexible Naming**: Project and document IDs support URL-safe strings up to 24 characters (a-z, A-Z, 0-9, _, -).

## Development Guidelines

- **Firestore Compatibility**: Maintain API parity with Firebase/Firestore SDK
- **Environment Detection**: Support both browser and Node.js environments automatically
- **Error Handling**: Use `BasebaseError` class with standardized error codes
- **Path Validation**: All document/collection paths are validated for security
- **Token Management**: Secure JWT handling with automatic expiration checks

## Testing

Run the included test webapp at `test.html` which demonstrates:
- Automatic SDK initialization
- Phone verification flow
- CRUD operations on test collection
- Real-time UI updates

Requires building the SDK first: `npm run build`