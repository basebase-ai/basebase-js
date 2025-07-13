# BaseBase JavaScript SDK

An SDK for BaseBase server interactions, patterned after the Firebase/Firestore SDK. Makes it easy to build web applications that use BaseBase as a data store and user authentication service.

## ⚠️ Early Development

This SDK is currently in early development (0.1.x). The API may change between versions. Please use with caution in production environments.

## 🚀 Features

- **No initialization required** - Set environment variable and start using immediately
- **Firebase-like API** - Drop-in replacement for Firebase/Firestore
- **Phone verification authentication** - SMS-based auth with JWT tokens
- **Real-time data operations** - CRUD operations with collections and documents
- **Advanced querying** - where, orderBy, limit constraints
- **TypeScript support** - Full type safety and IntelliSense
- **Cookie & localStorage management** - Automatic token persistence
- **Cross-platform** - Works in browsers and Node.js environments

## 📦 Installation

```bash
npm install basebase-js
```

Or with yarn:

```bash
yarn add basebase-js
```

## 🛠 Quick Start

### 1. Start Using Immediately - No Setup Required!

```typescript
import { doc, getDoc, collection, getDocs, addDoc } from "basebase-js";

// Get a single document - no setup needed!
const userRef = doc("users/user123");
const userSnap = await getDoc(userRef);
if (userSnap.exists) {
  console.log("User data:", userSnap.data());
}

// Get all documents in a collection
const usersRef = collection("users");
const snapshot = await getDocs(usersRef);
snapshot.forEach((doc) => {
  console.log(doc.id, doc.data());
});

// Add a new document
const newUserRef = await addDoc(collection("users"), {
  name: "Jane Doe",
  email: "jane@example.com",
});
console.log("New user ID:", newUserRef.id);
```

### 2. Authentication (Only When You Need It)

```typescript
import { requestCode, verifyCode } from "basebase-js";

// Request SMS verification code
const response = await requestCode("john_doe", "+1234567890");

// Verify the code and get JWT token (API key only needed here)
const authResult = await verifyCode(
  "+1234567890",
  "123456",
  "bb_your_api_key_here" // API key only needed during auth
);
console.log("User:", authResult.user);
console.log("Token:", authResult.token);

// Token is automatically stored in cookies and localStorage
// After this, all other functions work without any setup!
```

### 3. Server/Node.js Environments (If Applicable)

For server environments without browser storage, provide JWT token manually:

```typescript
import { setSingletonToken, doc, getDoc } from "basebase-js";

// Set user's JWT token before using data functions
setSingletonToken("user_jwt_token_here");

// Now use normally
const userRef = doc("users/user123");
const userSnap = await getDoc(userRef);
```

### 4. Document Operations

```typescript
import {
  doc,
  collection,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
} from "basebase-js";

// Get a single document
const userRef = doc("users/user123");
const userSnap = await getDoc(userRef);
if (userSnap.exists) {
  console.log("User data:", userSnap.data());
}

// Get all documents in a collection
const usersRef = collection("users");
const snapshot = await getDocs(usersRef);
snapshot.forEach((doc) => {
  console.log(doc.id, doc.data());
});

// Add document with auto-generated ID
const newUserRef = await addDoc(collection("users"), {
  name: "Jane Doe",
  email: "jane@example.com",
});

// Set document with specific ID
const userId = "507f1f77bcf86cd799439011";
await setDoc(doc(`users/${userId}`), {
  name: "John Doe",
  email: "john@example.com",
});

// Update specific fields
await updateDoc(doc("users/user123"), {
  age: 31,
  "profile.lastLogin": new Date().toISOString(),
});

// Delete document
await deleteDoc(doc("users/user123"));
```

### 5. Path Structure & Cross-Project Operations

**Important**: All paths are relative to the specified project. This eliminates ambiguity:

- ✅ `"users"` = collection named "users"
- ✅ `"users/user123"` = document "user123" in "users" collection
- ✅ `"users/user123/posts"` = "posts" subcollection under document "user123"

To work with a different project, use the optional `projectName` parameter:

```typescript
// Work with documents in another project
const otherUserRef = doc("users/user123", "otherProject");
const otherUserData = await getDoc(otherUserRef);

// Add to another project's collection
await addDoc(collection("users", "otherProject"), {
  name: "Cross-project user",
});

// Set document with same ID across projects (powerful for data consistency)
const userId = "507f1f77bcf86cd799439011";

// Set base user data in main project
await setDoc(doc(`users/${userId}`), {
  name: "John Doe",
  email: "john@example.com",
  phone: "+1234567890",
});

// Set app-specific data in another project using same ID
await setDoc(doc(`users/${userId}`, "newsapp"), {
  sources: ["techcrunch", "ars-technica"],
  preferences: { theme: "dark", notifications: true },
});
```

### 6. Querying Data

```typescript
import { query, where, orderBy, limit, getDocs, collection } from "basebase-js";

// Advanced queries
const q = query(
  collection("users"),
  where("age", ">=", 18),
  where("status", "==", "active"),
  orderBy("name", "asc"),
  limit(10)
);

const querySnapshot = await getDocs(q);
querySnapshot.forEach((doc) => {
  console.log(doc.data());
});
```

### 7. Direct-by-Path Convenience Functions

```typescript
import {
  getDocByPath,
  setDocByPath,
  updateDocByPath,
  deleteDocByPath,
  addDocToCollection,
} from "basebase-js";

// Get document directly by path
const userSnap = await getDocByPath("users/user123");

// Set document directly by path
await setDocByPath("users/user123", { name: "John Doe" });

// Update document directly by path
await updateDocByPath("users/user123", { age: 31 });

// Delete document directly by path
await deleteDocByPath("users/user123");

// Add document to collection directly by path
const newDoc = await addDocToCollection("users", { name: "Jane Doe" });
```

## 📚 API Reference

### Auto-Initializing Singleton

The SDK works immediately without any setup for browser applications. JWT tokens are automatically managed after authentication.

#### Server Environment Configuration

For server/Node.js environments, provide JWT token manually:

```typescript
import { setSingletonToken } from "basebase-js";

// Set user's JWT token before using data functions
setSingletonToken("user_jwt_token_here");
```

Or via environment variable:

```bash
BASEBASE_TOKEN=user_jwt_token_here
```

### Authentication

#### `requestCode(name, phone, baseUrl?)`

Request an SMS verification code.

```typescript
const response = await requestCode("john_doe", "+1234567890");
```

#### `verifyCode(phone, code, projectApiKey, baseUrl?)`

Verify SMS code and get authentication token.

```typescript
const result = await verifyCode("+1234567890", "123456", "bb_your_api_key");
```

#### `getAuthState()`

Get current authentication state.

```typescript
const authState = getAuthState();
console.log("Authenticated:", authState.isAuthenticated);
console.log("User:", authState.user);
```

#### `signOut()`

Sign out the current user.

```typescript
signOut();
```

### Document Operations

#### `doc(path, projectName?)`

Create a document reference. Paths are always relative to the specified project.

```typescript
// Document in your project
const docRef = doc("users/user123");

// Document in another project
const otherDocRef = doc("users/user123", "otherProject");
```

#### `collection(path, projectName?)`

Create a collection reference. Paths are always relative to the specified project.

```typescript
// Collection in your project
const collectionRef = collection("users");

// Collection in another project
const otherCollectionRef = collection("users", "otherProject");
```

#### `getDoc(docRef)`

Get a document snapshot.

```typescript
const docRef = doc("users/user123");
const snapshot = await getDoc(docRef);
if (snapshot.exists) {
  console.log("User data:", snapshot.data());
}
```

#### `getDocs(collectionRef)`

Get all documents in a collection.

```typescript
const collectionRef = collection("users");
const snapshot = await getDocs(collectionRef);
snapshot.forEach((doc) => {
  console.log(doc.id, doc.data());
});
```

#### `addDoc(collectionRef, data)`

Add a new document with auto-generated ID.

```typescript
const docRef = await addDoc(collection("users"), {
  name: "Jane Doe",
  email: "jane@example.com",
});
console.log("New document ID:", docRef.id);
```

#### `setDoc(docRef, data, options?)`

Set a document with a specific ID, optionally merging with existing data.

```typescript
const userId = "507f1f77bcf86cd799439011";
const userRef = doc(`users/${userId}`);
await setDoc(userRef, {
  name: "John Doe",
  email: "john@example.com",
});

// Merge with existing data
await setDoc(userRef, { age: 30 }, { merge: true });
```

#### `updateDoc(docRef, data)`

Update specific fields in a document.

```typescript
const docRef = doc("users/user123");
await updateDoc(docRef, {
  age: 31,
  "profile.lastLogin": new Date().toISOString(),
});
```

#### `deleteDoc(docRef)`

Delete a document.

```typescript
const docRef = doc("users/user123");
await deleteDoc(docRef);
```

### Querying

#### `query(collectionRef, ...constraints)`

Create a query with constraints.

```typescript
const q = query(
  collection("users"),
  where("age", ">=", 18),
  orderBy("name"),
  limit(10)
);
```

#### `where(field, operator, value)`

Create a where constraint.

Supported operators: `==`, `!=`, `<`, `<=`, `>`, `>=`, `array-contains`, `in`, `not-in`, `array-contains-any`

```typescript
where("status", "==", "active");
where("age", ">=", 18);
where("tags", "array-contains", "javascript");
where("category", "in", ["tech", "science"]);
```

#### `orderBy(field, direction?)`

Create an orderBy constraint.

```typescript
orderBy("createdAt", "desc");
orderBy("name"); // defaults to 'asc'
```

#### `limit(count)`

Limit the number of results.

```typescript
limit(10);
```

### Direct-by-Path Functions

#### `getDocByPath(path, projectName?)`

Get a document directly by path.

```typescript
const userSnap = await getDocByPath("users/user123");
```

#### `setDocByPath(path, data, options?, projectName?)`

Set a document directly by path.

```typescript
await setDocByPath("users/user123", { name: "John Doe" });
```

#### `updateDocByPath(path, data, projectName?)`

Update a document directly by path.

```typescript
await updateDocByPath("users/user123", { age: 31 });
```

#### `deleteDocByPath(path, projectName?)`

Delete a document directly by path.

```typescript
await deleteDocByPath("users/user123");
```

#### `addDocToCollection(collectionPath, data, projectName?)`

Add a document to a collection directly by path.

```typescript
const docRef = await addDocToCollection("users", { name: "Jane Doe" });
```

## 🧪 Testing

A simple test webapp is included at `test.html` to demonstrate SDK functionality:

1. **Build the SDK:**

   ```bash
   npm install
   npm run build
   ```

2. **Open the test webapp:**
   Open `test.html` in your browser (requires internet connection for js-cookie CDN). The webapp includes:

   - Automatic SDK initialization (no manual setup!)
   - Phone verification authentication flow
   - Key-value data operations on a "test" collection
   - Real-time UI updates

3. **Test workflow:**
   - Set your API key in the environment or configuration
   - Request SMS verification code
   - Verify code to authenticate
   - Add/view/delete key-value pairs
   - Test sign out functionality

> **Note:** The test webapp uses the UMD build (`dist/index.umd.js`) for browser compatibility and loads js-cookie from CDN. It defaults to `https://app.basebase.us`. Adjust the configuration for your BaseBase server instance.

## 🔧 Configuration

### Browser Applications

**No configuration needed!** Just import and use:

```typescript
import { doc, getDoc, setDoc } from "basebase-js";

// Works immediately - no setup required
const userRef = doc("users/user123");
const snapshot = await getDoc(userRef);
```

### Server/Node.js Applications

For server environments, provide JWT token manually:

**Option 1: Environment Variable**

```bash
# .env file
BASEBASE_TOKEN=user_jwt_token_here
```

**Option 2: Programmatic Setup**

```typescript
import { setSingletonToken, doc, getDoc } from "basebase-js";

// Set user's JWT token before using data functions
setSingletonToken("user_jwt_token_here");

// Now use normally
const userRef = doc("users/user123");
const snapshot = await getDoc(userRef);
```

### TypeScript Configuration

The SDK is written in TypeScript and provides full type safety:

```typescript
import { BasebaseDocumentData, DocumentSnapshot } from "basebase-js";

interface User extends BasebaseDocumentData {
  name: string;
  email: string;
  age: number;
}

const userSnap: DocumentSnapshot = await getDoc(doc("users/user123"));
const userData = userSnap.data() as User;
```

## 🔒 Security

### API Key Management

- Store your API key securely
- Never expose API keys in client-side code in production
- Use environment variables for configuration

### Authentication Flow

1. User provides phone number and full name
2. SMS verification code is sent
3. User enters code to get JWT token
4. Token is stored in cookies and localStorage
5. Token is automatically included in API requests

### Token Management

```typescript
import { getToken, isTokenExpired, validateStoredToken } from "basebase-js";

// Check if user has valid token
if (validateStoredToken()) {
  console.log("User is authenticated");
} else {
  console.log("User needs to sign in");
}

// Get current token
const token = getToken();
if (token && !isTokenExpired(token)) {
  console.log("Token is valid");
}
```

## 🚀 Migration from Firebase

BaseBase SDK is designed to be API-compatible with Firebase/Firestore. Here's how to migrate:

### Before (Firebase)

```typescript
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
} from "firebase/firestore";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const userRef = doc(db, "users", "user123");
const userSnap = await getDoc(userRef);
```

### After (BaseBase)

```typescript
import { doc, getDoc } from "basebase-js";

// Set environment variable: BASEBASE_API_KEY=bb_your_api_key_here

// No initialization needed!
const userRef = doc("users/user123");
const userSnap = await getDoc(userRef);
```

### Key Differences

1. **No initialization required** - BaseBase auto-initializes from environment variables
2. **Authentication**: BaseBase uses phone verification instead of email/password
3. **Simpler API**: No need to pass database instance to every function call

## 📱 Browser Support

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- 📖 [Documentation](https://docs.basebase.us)
- 💬 [Community Discord](https://discord.gg/basebase)
- 🐛 [Issue Tracker](https://github.com/grenager/basebase-js-sdk/issues)
- 📧 [Email Support](mailto:support@basebase.us)

## 🔄 Changelog

See [CHANGELOG.md](CHANGELOG.md) for a list of changes and version history.

## Server Environment Authentication

For server environments (Node.js, Deno, etc.) where browser cookies and localStorage are not available, you need to provide the user's JWT token manually.

### Method 1: Environment Variable

```bash
# Set user's JWT token in your environment
BASEBASE_TOKEN=user_jwt_token_here
```

```typescript
import { doc, getDoc } from "basebase-js";

// Token automatically used from environment
const userRef = doc("users/user123");
const snapshot = await getDoc(userRef);
```

### Method 2: Programmatic Setup

```typescript
import { setSingletonToken, doc, getDoc } from "basebase-js";

// Set user's JWT token before using data functions
setSingletonToken("user_jwt_token_here");

// Now use normally
const userRef = doc("users/user123");
const snapshot = await getDoc(userRef);
```

### Advanced: Manual App Management (Multi-Tenant)

For advanced use cases like multi-tenant applications, you can still use the original manual initialization:

```typescript
import { initializeApp, getBasebase, doc, getDoc } from "basebase-js";

// Initialize multiple apps
const tenantAApp = initializeApp(
  {
    apiKey: "bb_tenant_a_api_key",
    projectId: "tenant-a",
  },
  "tenant-a"
);

const tenantBApp = initializeApp(
  {
    apiKey: "bb_tenant_b_api_key",
    projectId: "tenant-b",
  },
  "tenant-b"
);

// Get basebase instances
const tenantADb = getBasebase(tenantAApp);
const tenantBDb = getBasebase(tenantBApp);

// Use with specific tenants
const tenantAUserRef = doc(tenantADb, "users/user123");
const tenantBUserRef = doc(tenantBDb, "users/user123");
```

However, for most applications, the auto-initializing singleton approach is recommended for simplicity.
