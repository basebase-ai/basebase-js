# BaseBase JavaScript SDK

A Firebase-compatible SDK for BaseBase server interactions. Build web applications that can easily migrate between Firebase/Firestore and BaseBase with minimal code changes.

## 🚀 Features

- **Firebase-compatible API** - Drop-in replacement for Firebase/Firestore
- **Phone verification authentication** - SMS-based auth with JWT tokens
- **Real-time data operations** - CRUD operations with collections and documents
- **Advanced querying** - where, orderBy, limit constraints
- **TypeScript support** - Full type safety and IntelliSense
- **Cookie & localStorage management** - Automatic token persistence
- **Cross-platform** - Works in browsers and Node.js environments

## 📦 Installation

```bash
npm install basebase-js-sdk
```

Or with yarn:

```bash
yarn add basebase-js-sdk
```

## 🛠 Quick Start

### 1. Initialize BaseBase

```typescript
import { initializeApp, getBasebase } from "basebase-js-sdk";

// Initialize your BaseBase app
const app = initializeApp({
  projectId: "my-project",
  apiKey: "bb_your_api_key_here", // Get this from BaseBase console
  baseUrl: "https://app.basebase.us", // Optional, defaults to production
});

const basebase = getBasebase(app);
```

### 2. Authentication

```typescript
import { requestCode, verifyCode } from "basebase-js-sdk";

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

### 3. Working with Documents

```typescript
import { doc, getDoc, setDoc, collection, getDocs } from "basebase-js-sdk";

// Get a document
const userRef = doc(basebase, "users/user123");
const userSnap = await getDoc(userRef);

if (userSnap.exists) {
  console.log("User data:", userSnap.data());
} else {
  console.log("User not found");
}

// Set document data
await setDoc(userRef, {
  name: "John Doe",
  email: "john@example.com",
  age: 30,
});

// Get all documents in a collection
const usersRef = collection(basebase, "users");
const snapshot = await getDocs(usersRef);

snapshot.forEach((doc) => {
  console.log(doc.id, doc.data());
});
```

### 4. Querying Data

```typescript
import { query, where, orderBy, limit, getDocs } from "basebase-js-sdk";

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
    projectId: "your-project-id",
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

#### `requestCode(username, phone, baseUrl?)`

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
const snapshot = await getDoc(docRef);
if (snapshot.exists) {
  console.log(snapshot.data());
}
```

#### `getDocs(collectionRef)`

Get all documents in a collection.

```typescript
const snapshot = await getDocs(collectionRef);
snapshot.forEach((doc) => {
  console.log(doc.id, doc.data());
});
```

#### `setDoc(docRef, data, options?)`

Set document data.

```typescript
await setDoc(docRef, { name: "John", age: 30 });

// Merge with existing data
await setDoc(docRef, { email: "john@example.com" }, { merge: true });
```

#### `updateDoc(docRef, data)`

Update specific fields in a document.

```typescript
await updateDoc(docRef, {
  age: 31,
  "profile.lastLogin": new Date().toISOString(),
});
```

#### `deleteDoc(docRef)`

Delete a document.

```typescript
await deleteDoc(docRef);
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

## 🔧 Configuration

### Environment Variables

Create a `.env` file in your project:

```bash
BASEBASE_PROJECT_ID=your-project-id
BASEBASE_API_KEY=bb_your_api_key
BASEBASE_BASE_URL=https://app.basebase.us
```

### TypeScript Configuration

The SDK is written in TypeScript and provides full type safety:

```typescript
import { BasebaseDocumentData, DocumentSnapshot } from "basebase-js-sdk";

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

1. User provides phone number and username
2. SMS verification code is sent
3. User enters code to get JWT token
4. Token is stored in cookies and localStorage
5. Token is automatically included in API requests

### Token Management

```typescript
import { getToken, isTokenExpired, validateStoredToken } from "basebase-js-sdk";

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
} from "basebase-js-sdk";

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
- 🐛 [Issue Tracker](https://github.com/your-org/basebase-js-sdk/issues)
- 📧 [Email Support](mailto:support@basebase.us)

## 🔄 Changelog

See [CHANGELOG.md](CHANGELOG.md) for a list of changes and version history.
