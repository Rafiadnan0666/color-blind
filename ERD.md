# Entity Relationship Diagram - ClrBlind (Color Vision Accessibility App)

## Mermaid ERD

```mermaid
erDiagram
    USER_PROFILE ||--o{ SCAN_HISTORY : "has"
    USER_PROFILE ||--o{ FAVORITES : "bookmarks"
    USER_PROFILE ||--o{ SAVED_COLORS : "collects"
    USER_PROFILE ||--o{ SAVED_OBJECTS : "collects"
    USER_PROFILE ||--o{ OBJECT_ANALYTICS : "tracks"
    USER_PROFILE ||--o{ NOTIFICATIONS : "receives"
    USER_PROFILE ||--o{ FEEDBACK : "submits"
    USER_PROFILE ||--o{ OCR_HISTORY : "scans"
    USER_PROFILE ||--o{ ASSISTANT_HISTORY : "chats with"
    USER_PROFILE ||--|| USER_SETTINGS : "configures"

    USER_PROFILE {
        uuid id PK "auth.users.id"
        string full_name
        string avatar_url
        string language
        json CVD_preferences
        timestamp created_at
        timestamp updated_at
    }

    USER_SETTINGS {
        uuid userid PK FK "auth.users.id"
        boolean voice_enabled
        boolean notifications_enabled
        string theme "light|dark|grey|system"
        string performance_mode "quality|balanced|performance"
        json detection_modes_enabled
        json notification_preferences
        timestamp created_at
        timestamp updated_at
    }

    SCAN_HISTORY {
        uuid id PK
        uuid userid FK "auth.users.id"
        string mode
        string objectname
        string objectcolor
        decimal confidence
        timestamp createdat
    }

    FAVORITES {
        uuid id PK
        uuid userid FK "auth.users.id"
        string type
        string value
        string notes
        timestamp createdat
    }

    SAVED_COLORS {
        uuid id PK
        uuid userid FK "auth.users.id"
        string colorname
        string hexcode
        string rgbvalue
        timestamp createdat
        timestamp updatedat
    }

    SAVED_OBJECTS {
        uuid id PK
        uuid userid FK "auth.users.id"
        string objectname
        string notes
        timestamp createdat
        timestamp updatedat
    }

    OBJECT_ANALYTICS {
        uuid id PK
        uuid userid FK "auth.users.id"
        string objectname
        bigint totaldetections
        decimal averageconfidence
        timestamp lastseen
        timestamp createdat
    }

    NOTIFICATIONS {
        uuid id PK
        uuid userid FK "auth.users.id"
        string title
        string message
        string type
        boolean isread
        timestamp createdat
        timestamp updatedat
    }

    FEEDBACK {
        uuid id PK
        uuid userid FK "auth.users.id"
        int rating
        string feedback
        timestamp createdat
    }

    OCR_HISTORY {
        uuid id PK
        uuid userid FK "auth.users.id"
        text extractedtext
        string language
        timestamp createdat
    }

    ASSISTANT_HISTORY {
        uuid id PK
        uuid userid FK "auth.users.id"
        text question
        text answer
        timestamp createdat
    }
```

## Table Relationships Summary

| Table | Primary Key | Foreign Key | Description |
|-------|-------------|-------------|-------------|
| `UserProfile` | `id` (uuid) | References `auth.users.id` | User profile with CVD preferences |
| `UserSettings` | `userid` (uuid) | References `auth.users.id` | App preferences, theme, performance mode |
| `ScanHistory` | `id` (uuid) | `userid` → `auth.users.id` | Detection results with mode, object, color, confidence |
| `Favorites` | `id` (uuid) | `userid` → `auth.users.id` | Bookmarked detections |
| `SavedColors` | `id` (uuid) | `userid` → `auth.users.id` | User's color collection with hex/RGB |
| `SavedObjects` | `id` (uuid) | `userid` → `auth.users.id` | User's object collection with notes |
| `ObjectAnalytics` | `id` (uuid) | `userid` → `auth.users.id` | Aggregated detection statistics (RPC-driven) |
| `Notifications` | `id` (uuid) | `userid` → `auth.users.id` | In-app notification feed |
| `Feedback` | `id` (uuid) | `userid` → `auth.users.id` | User ratings and comments |
| `OCRHistory` | `id` (uuid) | `userid` → `auth.users.id` | OCR extraction history with language |
| `AssistantHistory` | `id` (uuid) | `userid` → `auth.users.id` | Q&A chat history with AI assistant |

## Key Relationships

1. **UserProfile → All Data Tables** (One-to-Many): All user data references `auth.users.id`
2. **UserProfile → UserSettings** (One-to-One): Settings linked by `userid`
3. **ScanHistory → ObjectAnalytics** (Aggregated via RPC): Analytics updated via `increment_object_analytics` RPC
4. **All tables → auth.users**: RLS policies enforce `auth.uid() = userid`

## Supabase Row Level Security (RLS) Policies

All tables have RLS enabled with policies:
- **Select**: `auth.uid() = userid` (users see only their data)
- **Insert**: `auth.uid() = userid` (users insert only their data)
- **Update**: `auth.uid() = userid` (users update only their data)
- **Delete**: `auth.uid() = userid` (users delete only their data)
- **Service Role**: Full access for server-side operations

## Indexes

```sql
-- ScanHistory
CREATE INDEX idx_scan_history_userid_createdat ON "ScanHistory" (userid, createdat DESC);
CREATE INDEX idx_scan_history_mode ON "ScanHistory" (mode);
CREATE INDEX idx_scan_history_objectname ON "ScanHistory" (objectname);

-- Favorites
CREATE INDEX idx_favorites_userid_createdat ON "Favorites" (userid, createdat DESC);

-- SavedColors
CREATE INDEX idx_saved_colors_userid ON "SavedColors" (userid);

-- SavedObjects
CREATE INDEX idx_saved_objects_userid ON "SavedObjects" (userid);

-- ObjectAnalytics
CREATE INDEX idx_object_analytics_userid_totaldetections ON "ObjectAnalytics" (userid, totaldetections DESC);

-- Notifications
CREATE INDEX idx_notifications_userid_isread ON "Notifications" (userid, isread);
CREATE INDEX idx_notifications_userid_createdat ON "Notifications" (userid, createdat DESC);

-- OCRHistory
CREATE INDEX idx_ocr_history_userid_createdat ON "OCRHistory" (userid, createdat DESC);

-- AssistantHistory
CREATE INDEX idx_assistant_history_userid_createdat ON "AssistantHistory" (userid, createdat);
```

## Data Flow

```
User Action (Camera/Upload) → On-Device ML Inference → Supabase CRUD
     ↓
All Processing Client-Side (TF.js, ONNX Runtime Web, Tesseract.js)
     ↓
Only Metadata Stored in Supabase (Object names, colors, confidence, timestamps)
     ↓
Real-time UI Updates via Supabase Realtime (optional)
```

## Privacy Architecture

- **100% Client-Side Inference**: Camera frames and images never leave device
- **Supabase Stores Only Metadata**: Object names, colors, confidence scores, timestamps
- **No Image Storage**: No base64, blobs, or file uploads to database
- **User Isolation**: RLS ensures users only access their own data