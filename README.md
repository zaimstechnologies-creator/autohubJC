# Al Shaheen Auto Hub - Enterprise Workshop, AI Diagnostics & Lounge TV System

A comprehensive, screen-responsive workshop management application built for **Al Shaheen Auto Hub** (DHA Phase 6, Lahore), designed to run on tablets, smartphones, desktop terminals, and Smart TVs in the customer waiting lounge.

---

## 🌟 Key Capabilities & New Features

### 1. 📺 Waiting Lounge TV Display (Hospital-Style Queue Radar)
- **URL Route**: `/tv` (public lounge display; no sign-in required)
- **Split-Screen Design for Smart TVs (55"+ 1080p / 4K)**:
  - **Left Side (62%) — Live Bay Radar & Queue Board**:
    - High-contrast, large-font display readable across the waiting lounge.
    - Tracks vehicles across all 6 workshop bays:
      - 🔍 **Bay 1**: Inspection & Diagnosis
      - 🔧 **Bay 2**: Mechanical & Engine
      - ⚡ **Bay 3**: Electrical & AC Clinic
      - 🔨 **Bay 4**: Denting & Body Craft
      - 🛞 **Bay 5**: 3D Alignment & Tyres
      - ✨ **Bay 6**: Car Wash & Detailing
    - **Ready for Collection Alert**: When marked ready, the car displays a glowing, pulsating emerald green badge:
      `✅ READY TO COLLECT — PLEASE PROCEED TO ACCOUNTS COUNTER`
    - **Audio Chime**: Automatic pleasant two-tone airport/hospital chime plays over TV speakers when any vehicle is marked ready!
    - **Announcement Queue**: Announcements run one at a time; the pending queue survives refreshes in the same TV browser. After each full cycle, vehicles still marked ready are announced again. Mark a vehicle `CLOSED_PAID` with **Settle** after collection to remove it from future announcements.
  - **Right Side (38%) — Al Shaheen YouTube Channel & Shorts Player**:
    - Embedded video player that continuously plays your official YouTube channel videos and Shorts to keep waiting customers entertained.
    - Sound toggle (`🔊 Sound ON` / `🔇 Muted`), Next Video button, and YouTube Setup modal.
  - **Bottom Ticker**: Running marquee announcement with lounge Wi-Fi password, complimentary tea/coffee reminders, and workshop helpline.
  - **TV Remote / Kiosk**: Open the lounge display directly without signing in. The public queue feed includes vehicle registration plates and the limited status fields shown on the lounge screen; customer contact and financial details are not exposed.

### 2. 📱 Vehicle Tracking
- **URL Route**: `/track` (sign-in required)
- Customers can track their vehicle live from their smartphone while waiting in the lounge or at a nearby cafe:
  - Enter Vehicle Plate Number (e.g., `AQP 007` or `LEA-21-4890`).
  - View real-time assigned workshop bay.
  - 4-Step visual progress tracker:
    1. *Vehicle Received & Inspection*
    2. *In Service at Bay*
    3. *Quality Control Check*
    4. *Ready for Delivery (Accounts Counter Clearance)*
  - One-click **WhatsApp Service Advisor** button with pre-filled vehicle details.
  - One-click **Download / View Job Card A4 PDF** button.

### 3. 🔒 Application Login
- Workshop management and customer vehicle tracking require a server-verified session. The home page and lounge TV are public; the TV queue endpoint exposes only the vehicle and status fields needed for the lounge display, including registration plates, without customer contact or financial details.
- After signing in, workshop management and tracking are available in the same authenticated session.
- Credentials are configured using server-only environment variables; no default username or password is shipped.

### 4. ⚡ Real-Time Cross-Screen Sync
- Workshop data refreshes through authenticated APIs, and the lounge queue refreshes automatically every six seconds. The public lounge display shows vehicle registration plates to help customers identify their vehicles.

### 5. 🤖 Gemini AI Diagnostics & Tablet Stylus Job Cards
- Built-in Google Gemini AI automotive diagnosis engine (Free Tier compatible).
- Configure `GEMINI_API_KEY` only as a server-side deployment secret; never enter it in browser settings or commit it to source control.
- AI repair instructions follow the concern's language: Roman Urdu/Hinglish or English. Advisors can switch the explanation between Roman Urdu and English.
- Vector car inspection schematic with tire tread depth ($mm$) and touch damage markings (Dent, Scratch, Chips, Rust).
- Stylus signature pads for Customer Approval and Service Incharge.
- A4 printable layout and high-definition PDF generator.

---

## 🚀 How to Host on Vercel (1-Click Deployment)

The project includes `vercel.json` and `package.json` pre-configured for instant zero-config deployment.

### Method A: Deploy via GitHub & Vercel Dashboard (Recommended)
1. Push this directory to your GitHub account (e.g. `github.com/your-username/al-shaheen-job-cards`).
2. Log in to [vercel.com](https://vercel.com).
3. Click **"Add New..."** → **"Project"**.
4. Select your `al-shaheen-job-cards` repository.
5. Click **"Deploy"** (keep all default build settings; no build command needed!).
6. Within 15 seconds, Vercel gives you your live production URL:
   `https://al-shaheen-job-cards.vercel.app`

### Method B: Deploy via Vercel CLI
If you have Vercel CLI installed:
```bash
npm i -g vercel
vercel
```
Follow the 3 prompts and your app is live!

---

## 📺 How to Set Up the Waiting Lounge TV

1. On your Smart TV (Samsung Tizen, LG webOS, Android TV, Apple TV, Amazon Fire TV, or Chromecast with Google TV):
   - Open the TV Web Browser.
   - Enter your URL: `https://your-app.vercel.app/tv`
2. Press the TV remote's **"Full Screen"** or **F11** button.
3. The TV will now continuously run the Live Bay Radar on the left, loop your YouTube videos/Shorts on the right, and chime whenever a customer's car is ready for collection!

---

## ▶️ How to Link Your YouTube Channel & Shorts

1. Open the app and click **"▶️ TV YouTube"** in the top navigation bar (or click **"⚙️ Setup"** on the TV screen).
2. Enter your details:
   - **YouTube Channel Handle**: e.g., `@AlShaheenAutoHub`
   - **YouTube Playlist ID**: Paste the ID of your YouTube playlist (e.g. `PLrAXtmErZgOdP_8GztsuViY4LpW7f3`) for an uninterrupted loop of your workshop Shorts and video reels.
   - **Direct Video IDs**: Or paste comma-separated video IDs (e.g., `_Wp3Z-wHnUo, b7dC2Hk4pWc`).
3. Click **"💾 Save & Refresh Player"**. The waiting room TV immediately starts streaming your videos!

---

## 🔐 Admin Login Configuration

The login screen is available at `/login`. Configure these values in `.env.local` for development and in the deployment's secret settings for production:

- `AUTH_USERNAME`: administrator account name.
- `AUTH_PASSWORD_HASH`: generated using `node scripts/hash-password.cjs` (enter exactly 12 characters with uppercase/lowercase letters, a number, and a symbol, without spaces; input is hidden and only its scrypt hash is printed).
- `AUTH_SECRET`: a random secret with at least 32 bytes. Generate one with `node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"`.
- `SUPABASE_SERVICE_ROLE_KEY`: server-only Supabase key used by private API routes. Never prefix it with `NEXT_PUBLIC_`.

Do not commit `.env.local` or share these secrets. `SUPABASE_SERVICE_ROLE_KEY` is only used on the server. Apply [supabase/schema.sql](./supabase/schema.sql) to remove the previous unrestricted database policies and restrict the tracking function to server-side use.

Sessions use a persistent HttpOnly, SameSite=Strict cookie, Secure in production, and expire 14 days after sign-in. Each sign-in creates a unique signed token. There is no refresh token for this single administrator account; sign in again after expiration. Logout clears the browser cookie; rotate `AUTH_SECRET` to invalidate all issued sessions. After changing the password policy, generate a new `AUTH_PASSWORD_HASH` and update it in `.env.local` and the deployment's secret settings.

## 💻 Local Testing & Development

You can test the full multi-screen experience on your local computer before deploying:

```bash
# Start the Next.js app
npm run dev
```
Then open:
- **Admin Login**: `http://localhost:3000/login`
- **Workshop Portal**: `http://localhost:3000/workshop`
- **Waiting Lounge TV Display**: `http://localhost:3000/tv`
- **Customer Mobile Tracker**: `http://localhost:3000/track`

---

## 🏢 Al Shaheen Auto Hub
*Main Bedian Road, Near Askari 11, DHA Phase 6, Lahore-Pakistan.*  
*Phone: +92 344-1411123 | +92 42 3573 2222*  
*Website: www.alshaheenautohub.com*
