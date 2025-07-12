# BaseBase JavaScript SDK

An SDK for BaseBase server interactions, patterned after the Firebase/Firestore SDK. Makes it easy to build web applications that use BaseBase as a data store and user authentication service.

## ⚠️ Early Development

This SDK is currently in early development (0.1.x). The API may change between versions. Please use with caution in production environments.

## 🚀 Features

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

### 1. Initialize BaseBase

```typescript
import { initializeApp, getBasebase } from "basebase-js";

// Initialize your BaseBase app
const app = initializeApp({
  apiKey: "bb_your_api_key_here",
});

const basebase = getBasebase(app);

// Or use the shorthand
const basebase = initializeBasebase({
  apiKey: "bb_your_api_key_here",
});
```

### 2. Authentication

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

// Token is automatically stored in cookies and localStorage
```

### 3. Document Operations

```typescript
import {
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
} from "basebase-js";

// Get a single document
const userRef = doc(basebase, "users/user123");
const userSnap = await getDoc(userRef);
if (userSnap.exists) {
  console.log("User data:", userSnap.data());
}

// Get all documents in a collection
const usersRef = collection(basebase, "users");
const snapshot = await getDocs(usersRef);
snapshot.forEach((doc) => {
  console.log(doc.id, doc.data());
});

// Add document with auto-generated ID
const newUserRef = await addDoc(collection(basebase, "users"), {
  name: "Jane Doe",
  email: "jane@example.com",
});

// Set document with specific ID (great for consistent IDs across collections)
const userId = "507f1f77bcf86cd799439011";
await setDoc(doc(basebase, `users/${userId}`), {
  name: "John Doe",
  email: "john@example.com",
});

// Update specific fields
await updateDoc(doc(basebase, "users/user123"), {
  age: 31,
  "profile.lastLogin": new Date().toISOString(),
});
```

### 4. Querying Data

```typescript
import { query, where, orderBy, limit, getDocs } from "basebase-js";

// Advanced queries
const q = query(
  collection(basebase, "users"),
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

### App Management

#### `initializeApp(config, name?)`

Initialize a BaseBase application.

```typescript
const app = initializeApp(
  {
    apiKey: "bb_your_api_key",
    baseUrl: "https://app.basebase.us", // optional
  },
  "my-app"
); // optional name
```

#### `getBasebase(app?)`

Get a BaseBase instance for database operations.

```typescript
const basebase = getBasebase(app);
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

#### `doc(basebase, path)`

Create a document reference.

```typescript
const docRef = doc(basebase, "users/user123");
```

#### `collection(basebase, path)`

Create a collection reference.

```typescript
const collectionRef = collection(basebase, "users");
```

#### `getDoc(docRef)`

Get a document snapshot.

```typescript
const docRef = doc(basebase, "users/user123");
const snapshot = await getDoc(docRef);
if (snapshot.exists) {
  console.log("User data:", snapshot.data());
}
```

#### `getDocs(collectionRef)`

Get all documents in a collection.

```typescript
const collectionRef = collection(basebase, "users");
const snapshot = await getDocs(collectionRef);
snapshot.forEach((doc) => {
  console.log(doc.id, doc.data());
});
```

#### `addDoc(collectionRef, data)`

Add a new document with auto-generated ID.

```typescript
const docRef = await addDoc(collection(basebase, "users"), {
  name: "Jane Doe",
  email: "jane@example.com",
});
console.log("New document ID:", docRef.id);
```

#### `setDoc(docRef, data, options?)`

Set a document with a specific ID, optionally merging with existing data.

```typescript
const userId = "507f1f77bcf86cd799439011";
const userRef = doc(basebase, `users/${userId}`);
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
const docRef = doc(basebase, "users/user123");
await updateDoc(docRef, {
  age: 31,
  "profile.lastLogin": new Date().toISOString(),
});
```

#### `deleteDoc(docRef)`

Delete a document.

```typescript
const docRef = doc(basebase, "users/user123");
await deleteDoc(docRef);
```

### Querying

#### `query(collectionRef, ...constraints)`

Create a query with constraints.

```typescript
const q = query(
  collection(basebase, "users"),
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

## 🧪 Testing

A simple test webapp is included at `test.html` to demonstrate SDK functionality:

1. **Build the SDK:**

   ```bash
   npm install
   npm run build
   ```

2. **Open the test webapp:**
   Open `test.html` in your browser (requires internet connection for js-cookie CDN). The webapp includes:

   - SDK configuration with API key and base URL
   - Phone verification authentication flow
   - Key-value data operations on a "test" collection
   - Real-time UI updates

3. **Test workflow:**
   - Configure your API key and BaseBase server URL
   - Initialize the SDK
   - Request SMS verification code
   - Verify code to authenticate
   - Add/view/delete key-value pairs
   - Test sign out functionality

> **Note:** The test webapp uses the UMD build (`dist/index.umd.js`) for browser compatibility and loads js-cookie from CDN. It defaults to `https://app.basebase.us`. Adjust the configuration for your BaseBase server instance.

## 🔧 Configuration

### Environment Variables

Create a `.env` file in your project:

```bash
BASEBASE_API_KEY=bb_your_api_key
BASEBASE_BASE_URL=https://app.basebase.us  # optional
BASEBASE_PROJECT_ID=your-project-id        # optional, derived from API key if not provided
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

const userSnap: DocumentSnapshot = await getDoc(userRef);
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
import {
  initializeApp,
  getBasebase,
  collection,
  doc,
  getDoc,
  getDocs,
} from "basebase-js";

const app = initializeApp(basebaseConfig);
const basebase = getBasebase(app);

const userRef = doc(basebase, "users/user123");
const userSnap = await getDoc(userRef);
```

### Key Differences

1. **Authentication**: BaseBase uses phone verification instead of email/password
2. **Configuration**: Different config object structure
3. **API Instance**: Use `getBasebase()` instead of `getFirestore()`

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

For server environments (Node.js, Deno, etc.) where browser cookies and localStorage are not available, you can directly provide a JWT token in the configuration or set it programmatically.

### Method 1: Provide Token in Configuration

```typescript
import { initializeApp, getBasebase } from "basebase-js";

// Initialize with a directly provided JWT token
const app = initializeApp({
  apiKey: "bb_your_api_key_here",
  projectId: "your-project-id",
  token: "your-jwt-token-here", // Direct token for server environments
});

const basebase = getBasebase(app);

// Token will be automatically included in API requests
const usersRef = collection(basebase, "users");
const snapshot = await getDocs(usersRef);
```

### Method 2: Set Token Programmatically

```typescript
import { initializeApp, getBasebase, setDirectToken } from "basebase-js";

// Initialize app without token
const app = initializeApp({
  apiKey: "bb_your_api_key_here",
  projectId: "your-project-id",
});

// Set token programmatically (useful when token is obtained from external source)
setDirectToken("your-jwt-token-here");

const basebase = getBasebase(app);

// Token will be automatically included in API requests
const usersRef = collection(basebase, "users");
const snapshot = await getDocs(usersRef);
```

### Token Management Functions

```typescript
import {
  setDirectToken,
  getDirectToken,
  removeDirectToken,
  getToken, // Works in both browser and server environments
} from "basebase-js";

// Set token directly (for server environments)
setDirectToken("your-jwt-token-here");

// Get currently set token
const token = getDirectToken(); // Returns directly set token
// or
const token = getToken(); // Returns token from any source (cookies, localStorage, or directly set)

// Remove directly set token
removeDirectToken();
```

### Environment Detection

The SDK automatically detects the environment and uses the appropriate token storage:

- **Browser environments**: Uses cookies and localStorage
- **Server environments**: Uses direct token storage
- **Hybrid**: Supports both simultaneously

```typescript
// This works in both browser and server environments
const token = getToken(); // Returns appropriate token for current environment
```
