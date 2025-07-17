# BaseBase JavaScript SDK

An SDK for BaseBase server interactions, patterned after the Firebase/Firestore SDK. Makes it easy to build web applications that use BaseBase as a data store and user authentication service.

## ⚠️ Early Development

This SDK is currently in early development (0.1.x). The API may change between versions. Please use with caution in production environments.

## 🚀 Features

- **No initialization required** - Set environment variable and start using immediately
- **Firebase-like API** - Drop-in replacement for Firebase/Firestore
- **Phone verification authentication** - SMS-based auth with JWT tokens
- **Real-time data operations** - CRUD operations with collections and documents
- **Advanced querying** - where, orderBy, limit constraints with server-side structured queries
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

### 1. Authentication First

```typescript
import { requestCode, verifyCode } from "basebase-js";

// Request SMS verification code
const response = await requestCode("john_doe", "+1234567890");

// Verify the code and get JWT token
const authResult = await verifyCode(
  "+1234567890",
  "123456",
  "bb_your_api_key_here"
);
console.log("User:", authResult.user);
console.log("Token:", authResult.token);

// Token is automatically stored - now you can use the database!
```

### 2. Start Using Database - No Setup Required!

#### Browser (after authentication):

```typescript
import { db, doc, getDoc, collection, getDocs, addDoc } from "basebase-js";

// Get a single document - no setup needed after auth!
const userRef = doc(db, "myproject/users/user123");
const userSnap = await getDoc(userRef);
if (userSnap.exists) {
  console.log("User data:", userSnap.data());
}

// Get all documents in a collection
const usersRef = collection(db, "myproject/users");
const snapshot = await getDocs(usersRef);
snapshot.forEach((doc) => {
  console.log(doc.id, doc.data());
});

// Add a new document
const newUserRef = await addDoc(collection(db, "myproject/users"), {
  name: "Jane Doe",
  email: "jane@example.com",
});
console.log("New user ID:", newUserRef.id);
```

#### Server/Node.js (with token):

```typescript
import { getDatabase, doc, getDoc, collection, addDoc } from "basebase-js";

// Create database instance with JWT token
const db = getDatabase("your_jwt_token_here");

// Use exactly the same API as browser
const userRef = doc(db, "myproject/users/user123");
const userSnap = await getDoc(userRef);
if (userSnap.exists) {
  console.log("User data:", userSnap.data());
}
```

### 3. Document Operations

```typescript
import {
  db,
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
const userRef = doc(db, "myproject/users/user123");
const userSnap = await getDoc(userRef);
if (userSnap.exists) {
  console.log("User data:", userSnap.data());
}

// Get all documents in a collection
const usersRef = collection(db, "myproject/users");
const snapshot = await getDocs(usersRef);
snapshot.forEach((doc) => {
  console.log(doc.id, doc.data());
});

// Add document with auto-generated ID
const newUserRef = await addDoc(collection(db, "myproject/users"), {
  name: "Jane Doe",
  email: "jane@example.com",
});

// Set document with specific ID (URL-safe string up to 255 characters)
const userId = "ben_wen";
await setDoc(doc(db, `users/${userId}`), {
  name: "John Doe",
  email: "john@example.com",
});

// Update specific fields
await updateDoc(doc(db, "myproject/users/user123"), {
  age: 31,
  lastLogin: new Date().toISOString(),
});

// Delete document
await deleteDoc(doc(db, "myproject/users/user123"));
```

### 4. Path Structure & Naming Rules

**Project IDs**: BaseBase allows flexible naming for projects using URL-safe strings up to 24 characters long:

- ✅ Allowed characters: `a-z`, `A-Z`, `0-9`, `_`, `-`
- ✅ Examples: `test_project`, `myapp2024`, `ben_wen`
- ❌ Not allowed: spaces, special characters like `/`, `@`, `.`, etc.
- ❌ Must be 24 characters or less

**Document IDs**: Document IDs can be URL-safe strings up to 255 characters long:

- ✅ Allowed characters: `a-z`, `A-Z`, `0-9`, `_`, `-`
- ✅ Examples: `user-123`, `very-long-document-identifier-with-lots-of-detail`, `ben_wen`
- ❌ Not allowed: spaces, special characters like `/`, `@`, `.`, etc.
- ❌ Must be 255 characters or less

**Path Structure**: All paths are relative to the specified project. This eliminates ambiguity:

- ✅ `"users"` = collection named "users"
- ✅ `"users/ben_wen"` = document "ben_wen" in "users" collection
- ✅ `"users/ben_wen/posts"` = "posts" subcollection under document "ben_wen"

To work with a different project, use the optional `projectName` parameter:

```typescript
// Work with documents in another project
const otherUserRef = doc(db, "otherproject/users/user123");
const otherUserData = await getDoc(otherUserRef);

// Add to another project's collection
await addDoc(collection(db, "users", "otherProject"), {
  name: "Cross-project user",
});

// Set document with same ID across projects (powerful for data consistency)
const userId = "user_ben";

// Set base user data in main project
await setDoc(doc(db, `users/${userId}`), {
  name: "John Doe",
  email: "john@example.com",
  phone: "+1234567890",
});

// Set app-specific data in another project using same ID
await setDoc(doc(db, `users/${userId}`, "news_app"), {
  sources: ["techcrunch", "ars-technica"],
  preferences: { theme: "dark", notifications: true },
});
```

### 5. Querying Data

```typescript
import {
  db,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  collection,
} from "basebase-js";

// Advanced queries
const q = query(
  collection(db, "myproject/users"),
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

## 📚 API Reference

### Authentication

#### `requestCode(username, phone, baseUrl?)`

Request an SMS verification code. Username must be alphanumeric characters only with no spaces.

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

#### `onAuthStateChanged(callback)`

Listen for authentication state changes.

```typescript
const unsubscribe = onAuthStateChanged((authState) => {
  if (authState.isAuthenticated) {
    console.log("User signed in:", authState.user);
  } else {
    console.log("User signed out");
  }
});

// Later, stop listening
unsubscribe();
```

### Document Operations

#### `doc(db, path, projectName?)`

Create a document reference. Paths are always relative to the specified project.

```typescript
// Document in your project
const docRef = doc(db, "myproject/users/user123");

// Document in another project
const otherDocRef = doc(db, "otherproject/users/user123");
```

#### `collection(db, path, projectName?)`

Create a collection reference. Paths are always relative to the specified project.

```typescript
// Collection in your project
const collectionRef = collection(db, "myproject/users");

// Collection in another project
const otherCollectionRef = collection(db, "users", "otherProject");
```

#### `getDoc(docRef)`

Get a document snapshot.

```typescript
const docRef = doc(db, "myproject/users/user123");
const snapshot = await getDoc(docRef);
if (snapshot.exists) {
  console.log("User data:", snapshot.data());
}
```

#### `getDocs(collectionRef)`

Get all documents in a collection.

```typescript
const collectionRef = collection(db, "myproject/users");
const snapshot = await getDocs(collectionRef);
snapshot.forEach((doc) => {
  console.log(doc.id, doc.data());
});
```

#### `addDoc(collectionRef, data)`

Add a new document with auto-generated ID.

```typescript
const docRef = await addDoc(collection(db, "myproject/users"), {
  name: "Jane Doe",
  email: "jane@example.com",
});
console.log("New document ID:", docRef.id);
```

#### `setDoc(docRef, data, options?)`

Set a document with a specific ID, optionally merging with existing data.

```typescript
const userId = "john_doe";
const userRef = doc(db, `users/${userId}`);
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
const docRef = doc(db, "myproject/users/user123");
await updateDoc(docRef, {
  age: 31,
  lastLogin: new Date().toISOString(),
});
```

#### `deleteDoc(docRef)`

Delete a document.

```typescript
const docRef = doc(db, "myproject/users/user123");
await deleteDoc(docRef);
```

### Querying

#### `query(collectionRef, ...constraints)`

Create a query with constraints.

```typescript
const q = query(
  collection(db, "myproject/users"),
  where("age", ">=", 18),
  orderBy("name"),
  limit(10)
);
```

#### `where(field, operator, value)`

Create a where constraint.

Supported operators: `==`, `!=`, `<`, `<=`, `>`, `>=`, `array-contains`, `in`, `not-in`, `array-contains-any`, `matches`

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

#### `runStructuredQuery(collectionRef, ...constraints)`

**NEW:** Execute queries using server-side structured query processing (recommended for better performance).

This function uses the POST `:runQuery` endpoint with structured query support, providing server-side filtering and sorting instead of client-side processing.

```typescript
import {
  db,
  collection,
  where,
  orderBy,
  limit,
  runStructuredQuery,
} from "basebase-js";

// Server-side structured query with filtering, ordering, and limiting
const usersRef = collection(db, "myproject/users");
const results = await runStructuredQuery(
  usersRef,
  where("age", ">=", 18), // Server-side filtering
  where("status", "==", "active"), // Multiple filters supported
  orderBy("name", "asc"), // Server-side sorting
  limit(10) // Limit results
);

// Process results
results.forEach((doc) => {
  console.log("User:", doc.data());
});
```

**Advantages of `runStructuredQuery`:**

- ✅ **Server-side processing** - Better performance for large datasets
- ✅ **Native database filtering** - More efficient than client-side filtering
- ✅ **Reduced network traffic** - Only matching documents are returned
- ✅ **Same API** - Uses the same `where`, `orderBy`, `limit` constraints

**Supported operators:** `==`, `!=`, `<`, `<=`, `>`, `>=`, `array-contains`, `in`, `not-in`, `array-contains-any`, `matches`

**Example with multiple filters:**

```typescript
// Find active adult users, sorted by creation date, limit 20
const results = await runStructuredQuery(
  collection(db, "myproject/users"),
  where("age", ">=", 21),
  where("status", "==", "active"),
  where("role", "in", ["admin", "moderator"]),
  orderBy("createdAt", "desc"),
  limit(20)
);
```

**Custom server configuration:**
For custom BaseBase server instances, use explicit database configuration:

```typescript
import { getDatabase, collection, runStructuredQuery } from "basebase-js";

// Create database instance with custom server
const db = getDatabase({
  token: "your_jwt_token",
  baseUrl: "http://localhost:8000",
});

const results = await runStructuredQuery(
  collection(db, "myproject/users"),
  where("age", ">=", 18),
  orderBy("name"),
  limit(10)
);
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

   - Phone verification authentication flow
   - Document operations on a "test" collection
   - Real-time UI updates

3. **Test workflow:**
   - Set your API key in the test interface
   - Request SMS verification code
   - Verify code to authenticate
   - Add/view/update/delete documents
   - Test sign out functionality

> **Note:** The test webapp uses the UMD build (`dist/index.umd.js`) for browser compatibility and loads js-cookie from CDN. It defaults to `https://api.basebase.us`. Adjust the configuration for your BaseBase server instance.

## 🔧 Configuration

### Browser Applications

**Authentication required first:**

```typescript
import { requestCode, verifyCode, doc, getDoc, setDoc } from "basebase-js";

// 1. Authenticate first
await verifyCode("+1234567890", "123456", "bb_your_api_key");

// 2. Then use database - no setup required
const userRef = doc(db, "myproject/users/user123");
const snapshot = await getDoc(userRef);
```

### Server/Node.js Applications

For server environments, use the `getDatabase` function with a JWT token:

```typescript
import { getDatabase, doc, getDoc } from "basebase-js";

// Create a database instance with your JWT token
const db = getDatabase("user_jwt_token_here");

// Now use normally
const userRef = doc(db, "myproject/users/user123");
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

const userSnap: DocumentSnapshot = await getDoc(
  doc(db, "myproject/users/user123")
);
const userData = userSnap.data() as User;
```

## 🔒 Security

### API Key Management

- Store your API key securely
- Never expose API keys in client-side code in production
- Use environment variables for configuration

### Authentication Flow

1. User provides phone number and username (alphanumeric only)
2. SMS verification code is sent
3. User enters code to get JWT token
4. Token is stored in cookies and localStorage
5. Token is automatically included in API requests

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

const userRef = doc(db, "myproject/users/user123");
const userSnap = await getDoc(userRef);
```

### After (BaseBase)

```typescript
import { verifyCode, db, doc, getDoc } from "basebase-js";

// Authenticate first
await verifyCode("+1234567890", "123456", "bb_your_api_key");

// Then use database - no initialization needed!
const userRef = doc(db, "myproject/users/user123");
const userSnap = await getDoc(userRef);
```

### Key Differences

1. **Authentication required first** - BaseBase uses phone verification
2. **No initialization required** - BaseBase exports a ready-to-use `db` object after auth
3. **Path format**: BaseBase uses slash-separated paths instead of separate arguments (e.g., `"users/user123"` vs `"users", "user123"`)

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
