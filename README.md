# Event & Media Management Platform

An advanced, full-stack monorepo web application designed for organization clubs, event hosts, and media management. This platform utilizes real-time communication and cloud-based AI to automatically tag attendees in photographs, handle role-based media downloads, apply dynamic watermarks, and issue real-time notifications.

---

## Key Features

### 1. Event Management
*   **Event Creation & Administration**: Admins can create and manage events with custom metadata (title, description, category, date, and location).
*   **Event-wise Albums**: Every event has its own dedicated media album gallery.
*   **Metadata & Organization**: Rich event descriptions and details are displayed on the event page.
*   **Sorting & Filtering**: Find events easily by sorting on:
    *   **Event Name** (alphabetical)
    *   **Date** (ascending/descending chronologically)
    *   **Category** (Sports, Graduation, Party, Wedding, Conference, etc.)

### 2. Media Upload System
*   **Diverse Formats**: Support for uploading high-quality photos and MP4 videos.
*   **Bulk Uploads**: Upload multiple files concurrently.
*   **Drag-and-Drop Interface**: Easy-to-use dropzone for drag-and-drop file additions.
*   **Media Previews**: Live client-side previews (images and video icons) before finalizing the upload.
*   **Optimized Storage**: Uses Node `sharp` to process, rotate, compress, and standardise uploaded selfies and images before storing.

### 3. Access Control & Authentication
*   **Authentication**: Secure user sign-up, sign-in, and authorization.
*   **Public Media**: Publicly marked media is accessible to all platform users.
*   **Private Media**: Restricts visibility of private media to authorized club members only.
*   **Role-Based Access Control**:
    *   `Admin`: Can create events, invite photographers, and upload/download clean originals.
    *   `Photographer`: Can upload event media and download clean originals.
    *   `Club Member`: Can view events, RSVP, view private media, and download dynamically watermarked assets.
    *   `Viewer`: Default guest/external user who can view public albums and download watermarked assets.

### 4. Social Features
*   **Likes & Comments**: Interactive gallery where users can like media and write comments.
*   **Download & Share**: Download option with automatic, on-the-fly watermarking.
*   **Favourites**: Save your favorite event photos to a personalized dashboard section.
*   **Manual Tagging**: Tag friends/users manually in images by clicking on their faces.
*   **Real-Time Notifications**: Instantly notifies users via WebSockets for events like:
    *   *Someone liked your photo*
    *   *Someone tagged you in an event photo*
    *   *Someone commented on your uploaded media*

### 5. AI/ML Features
*   **Smart Image Tagging**: Automatically detects scenes and objects (e.g. mountains, beaches, sports, crowd) using AWS Rekognition Labels.
*   **Advanced Search**: Robust query capabilities to search by **Event Name**, **Tags**, **Upload Date**, and **User Name**.
*   **Facial Recognition**:
    1. **Selfie Registration**: Register by uploading a reference face selfie.
    2. **Auto-Match Detection**: Scans newly uploaded event photos, matches them against the registered collection, and links them to the correct user.
    3. **Personalized Feed**: A dedicated "Matched Photos" section displays all photos where the logged-in user is detected.

### 6. Cloud Integration
*   **Amazon S3**: High-performance, secure object storage for hosting uploaded photos, videos, and handling secure uploads via presigned URLs.
*   **Amazon Rekognition**: Cloud-based AI service for facial indexing, face comparison, and automated object labeling.

### 7. Watermarking System
*   **Automatic Watermarking**: Applied dynamically upon asset download for general roles.
*   **Dynamic Custom Overlays**: Overlays custom metadata context on-the-fly using `sharp`, including:
    *   **Club Name**
    *   **Event Name**
    *   **User Name** & **Role**

---

## Tech Stack

### Frontend
*   **React (v18)** + **Vite**
*   **Tailwind CSS (v4)** for modern styling
*   **React Router DOM (v6)** for client-side routing
*   **Socket.io Client** for real-time listener hooks
*   **Lucide React** for beautiful UI iconography

### Backend
*   **Node.js** + **Express**
*   **MongoDB** + **Mongoose** (ODM for schema structures)
*   **Socket.io Server** for connection events and room management
*   **Sharp** for custom media operations, rotations, and dynamic watermark composting
*   **AWS SDK v3**:
    *   **Amazon S3** (Object storage & presigned URLs for secure client upload/downloads)
    *   **Amazon Rekognition** (Face Indexing, Facial Comparison, and Object Labeling)

---

## Project Structure

```
├── backend/
│   ├── config/          # Environment variables and database config
│   ├── middleware/      # Auth & route protectors
│   ├── models/          # Mongoose collections (User, Event, Media, Notification)
│   ├── routes/          # Express API controllers (auth, events, media, notifications)
│   ├── services/        # Business logic (e.g. Media/Download service)
│   ├── utils/           # Helper scripts (AWS S3 & Rekognition wrapper, watermark overlays)
│   └── index.js         # API Entrypoint & WebSocket initialization
├── frontend/
│   ├── src/
│   │   ├── components/  # Reusable UI elements (Navbar, Lightbox preview, cards)
│   │   ├── context/     # React state wrappers (AuthContext, NotificationContext)
│   │   ├── pages/       # Router views (Dashboard, MatchedPhotos, EventDetails, Profile, Favourites)
│   │   └── App.jsx      # Navigation routing setup
│   └── vite.config.js
└── package.json         # Workspace run scripts
```

---

## Getting Started

### 1. Environment Configurations

#### Backend (`backend/.env`)
Create a `.env` file inside `backend/` and configure:
```env
PORT=3000
MONGO_URI=mongodb://localhost:27017/event-media-db
JWT_SECRET=your_jwt_signing_key_here
NODE_ENV=development

# AWS Configuration (Fallbacks to simulated/mock S3 and Rekognition automatically if left blank or unreachable)
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_REGION=us-east-1
S3_BUCKET_NAME=your_s3_bucket_name
REKOGNITION_COLLECTION_ID=your_rekognition_collection_name
```

### 2. Install & Run (Monorepo Workspace)

In the root folder, install all workspace packages:
```bash
npm run install-all
```

To run backend and frontend concurrently in development mode:
```bash
npm run dev
```

The application will launch on:
*   Frontend: `http://localhost:5173`
*   Backend API: `http://localhost:3000`
