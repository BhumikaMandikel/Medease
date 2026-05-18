# Google Calendar Integration Setup Guide

## Overview
The Google Calendar integration allows users to add medication reminders directly to their Google Calendar. When the "Connect Google Calendar" button is clicked, it initiates Gmail-based authentication using Google OAuth 2.0.

## Current Status
✅ **Implementation Complete**
- Frontend: Calendar button in header, CalendarModal component
- Backend: Calendar API endpoints and service
- OAuth: Google Identity Services integration

⚠️ **Setup Required**
You need to configure a Google OAuth Client ID to enable the calendar integration.

---

## Step-by-Step Setup Instructions

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click "Select a project" → "New Project"
3. Enter project name: **MedEase**
4. Click "Create"

### 2. Enable Google Calendar API

1. In the Google Cloud Console, go to **APIs & Services** → **Library**
2. Search for "Google Calendar API"
3. Click on it and press **Enable**

### 3. Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Select **External** user type
3. Click **Create**
4. Fill in the required fields:
   - **App name**: MedEase
   - **User support email**: Your email
   - **Developer contact information**: Your email
5. Click **Save and Continue**
6. On the "Scopes" page, click **Add or Remove Scopes**
7. Search for and add: `https://www.googleapis.com/auth/calendar.events`
8. Click **Update** → **Save and Continue**
9. On "Test users" page, add your Gmail address for testing
10. Click **Save and Continue** → **Back to Dashboard**

### 4. Create OAuth 2.0 Client ID

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Select **Web application**
4. Enter name: **MedEase Web Client**
5. Under "Authorized JavaScript origins", click **Add URI**:
   - Add: `http://localhost:5173` (Vite dev server)
   - Add: `http://localhost:3000` (alternative port)
6. Under "Authorized redirect URIs" - leave empty (not needed for token client)
7. Click **Create**
8. A dialog will show your **Client ID** - **COPY THIS!**

### 5. Configure Frontend Environment

1. Open `medease/frontend/.env.local`
2. Replace the placeholder with your actual Client ID:
   ```
   VITE_GOOGLE_CLIENT_ID=YOUR_ACTUAL_CLIENT_ID_HERE.apps.googleusercontent.com
   ```
3. Save the file
4. The Vite dev server will automatically restart

### 6. Test the Integration

1. Make sure both backend and frontend are running:
   ```bash
   # Terminal 1 - Backend
   cd medease/backend
   uvicorn main:app --reload
   
   # Terminal 2 - Frontend
   cd medease/frontend
   npm run dev
   ```

2. Open the app in your browser: `http://localhost:5173`

3. Upload a medical document and wait for analysis

4. Click the **"📅 Connect Google Calendar"** button in the header

5. A Google sign-in popup should appear

6. Sign in with your Gmail account (must be added as a test user)

7. Grant permission to access your calendar

8. Once connected, the button changes to **"📅 Add Reminders"**

9. Click it to open the Calendar Modal showing all medicines

10. Select start date and click **"Add to My Calendar"**

11. Check your Google Calendar - you should see medication reminders!

---

## How It Works

### Frontend Flow
1. User clicks "Connect Google Calendar" button
2. `connectGoogleCalendar()` from `lib/Googleauth.ts` is called
3. Google Identity Services popup opens for authentication
4. User signs in and grants calendar access
5. Access token is received and stored in localStorage
6. Token is passed to parent component via `onGoogleConnect(token)`
7. Button changes to "Add Reminders"

### Calendar Modal Flow
1. User clicks "Add Reminders" button
2. `CalendarModal` component opens showing all medicines
3. Medicines with `duration_days > 0` are eligible
4. User can edit times for each medicine
5. User selects start date
6. Clicking "Add to My Calendar" calls backend for each medicine
7. Backend creates calendar events via Google Calendar API
8. Success message shows total reminders added

### Backend API
- **Endpoint**: `POST /api/calendar/add-events`
- **Purpose**: Create Google Calendar events for one medicine
- **Process**:
  - For each timing (e.g., 08:00, 21:00)
  - For each day (0 to duration_days - 1)
  - Create a 15-minute calendar event
  - With 5-minute popup reminder
  - In Asia/Kolkata timezone

---

## Features Implemented

✅ **OAuth Authentication**
- Gmail-based Google sign-in
- Token storage in localStorage
- Token expiry handling

✅ **Calendar Modal**
- Shows all medicines from analysis
- Inline time editing for each medicine
- Start date picker (defaults to today)
- Filters out medicines without duration
- Sequential API calls with loading states
- Error handling with retry option
- Success confirmation

✅ **Calendar Events**
- Event title: "💊 Take [Medicine Name]"
- Description includes dosage and food reminder
- 15-minute duration
- 5-minute popup reminder
- Proper timezone handling (Asia/Kolkata)

✅ **UI/UX**
- Prominent button in header
- Different states: Connect vs Add Reminders
- Visual feedback during processing
- Error messages with retry
- Success confirmation

---

## Troubleshooting

### Error: "invalid_client"
- **Cause**: Client ID not configured or incorrect
- **Fix**: Follow steps 1-5 above to get and set correct Client ID

### Error: "Access blocked: This app's request is invalid"
- **Cause**: OAuth consent screen not configured
- **Fix**: Complete step 3 above, ensure scope is added

### Error: "Token expired"
- **Cause**: Access token expired (typically after 1 hour)
- **Fix**: Click "Connect Google Calendar" again to get new token

### Calendar events not appearing
- **Check**: 
  1. Backend is running on port 8000
  2. CORS is configured correctly
  3. Medicine has `duration_days > 0`
  4. Check browser console for errors

### Popup blocked
- **Cause**: Browser blocking OAuth popup
- **Fix**: Allow popups for localhost in browser settings

---

## Security Notes

- Access tokens are stored in localStorage (client-side only)
- Tokens expire after ~1 hour for security
- Backend never stores tokens
- Only calendar.events scope is requested (minimal permissions)
- Test users must be explicitly added in OAuth consent screen

---

## File Structure

```
medease/
├── frontend/
│   ├── .env.local                          # ← Add your Client ID here
│   ├── index.html                          # Google Identity Services script
│   └── src/
│       ├── lib/
│       │   └── Googleauth.ts              # OAuth token client
│       └── components/
│           ├── ConversationView.tsx        # Calendar button
│           └── CalendarModal.tsx           # Modal with all medicines
└── backend/
    ├── routers/
    │   └── calendar.py                     # API endpoint
    └── services/
        └── calendar_service.py             # Google Calendar API calls
```

---

## Next Steps

1. ✅ Complete Google Cloud setup (steps 1-4)
2. ✅ Add Client ID to `.env.local` (step 5)
3. ✅ Test the integration (step 6)
4. 🎉 Users can now add medication reminders to their calendar!

---

## Support

If you encounter issues:
1. Check browser console for errors
2. Verify backend logs
3. Ensure all environment variables are set
4. Confirm OAuth consent screen is configured
5. Check that test user email is added

