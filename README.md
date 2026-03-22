# WanderLog - Premium Social Travel Platform

WanderLog is a sophisticated social travel platform designed for explorers to share verified travel stories, connect with a global community, and discover authentic destinations through stunning visuals and real experiences.

## 🚀 Technologies Used

### Frontend
- **React 19**: The latest version of the popular UI library for building interactive interfaces.
- **TypeScript**: Adds static typing to JavaScript for better developer experience and fewer bugs.
- **Vite 6**: A lightning-fast build tool and development server.
- **Tailwind CSS 4**: A utility-first CSS framework for rapid and modern UI development.
- **Motion (framer-motion)**: Used for smooth entrance/exit animations and layout transitions.
- **Lucide React**: A beautiful and consistent icon library.

### Backend & Infrastructure
- **Firebase Authentication**: Secure Google-based login for users.
- **Cloud Firestore**: A real-time NoSQL database for storing posts, comments, and user profiles.
- **Firebase Storage**: Securely hosts user-uploaded travel photos.
- **Firebase Security Rules**: Granular access control for database and storage resources.

### Utilities
- **Date-fns**: For elegant date and time formatting.
- **Clsx & Tailwind Merge**: For efficient and clean CSS class management.

---

## 📂 Project Structure

### Core Application Files
- **`src/App.tsx`**: The main application component. It handles the feed, post creation, commenting, and administrative verification logic.
- **`src/main.tsx`**: The entry point that initializes the React application and wraps it in an Error Boundary.
- **`src/firebase.ts`**: Centralized initialization of Firebase services (Auth, Firestore, and Storage).
- **`src/index.css`**: Global stylesheet importing Tailwind CSS utilities.

### Components & Utilities
- **`src/components/ErrorBoundary.tsx`**: Catches runtime errors and displays a professional fallback UI instead of a blank screen.
- **`src/utils/firestoreErrorHandler.ts`**: A specialized utility that formats Firestore errors into actionable JSON for easier debugging.

### Configuration & Security
- **`firebase-applet-config.json`**: Contains your unique Firebase project credentials.
- **`firebase-blueprint.json`**: A structural map of the data entities used in the application.
- **`firestore.rules`**: Defines the security logic for the database (e.g., only admins can verify posts).
- **`storage.rules`**: Defines security logic for file uploads.
- **`package.json`**: Manages project dependencies and development scripts.
- **`vite.config.ts`**: Configures the build system and environment variables.
- **`metadata.json`**: App metadata including name, description, and required permissions.

---

## 🛠️ Getting Started

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Run Development Server**:
   ```bash
   npm run dev
   ```

3. **Build for Production**:
   ```bash
   npm run build
   ```

---

## 🛡️ Security Features
- **Admin Verification**: New posts are marked as "Pending" and must be reviewed by an administrator before appearing in the public feed.
- **Owner Protection**: Users can only edit or delete their own content.
- **Data Validation**: Strict Firestore rules ensure that only valid data types and formats are saved to the database.
