# TimeBridge: Hackathon MVP Specification

## Overview
A zero-backend, URL-persistent web application for finding meeting slots across different time zones. The host selects potential slots, shares a link, and the guest views those slots in their local time.

## Target Audience
- Distributed teams
- Hackathon participants
- Remote workers

## Technical Stack
- **Framework**: Svelte (via Vite)
- **Styling**: Tailwind CSS
- **Icons**: Lucide Svelte
- **Date/Time**: `date-fns`, `date-fns-tz`
- **Sharing**: `qrcode.svelte` (for local display)
- **Deployment/Tunnel**: Localhost + `localtunnel` (for peer-to-peer demo)

## Core Features (2-Hour MVP)

### 1. Host Mode (The "Planner")
- **Slot Selection**: Interface to add multiple date/time slots.
- **Timezone Detection**: Auto-detects the host's current timezone.
- **Link Generation**: Encodes all selected slots into a compressed Base64 string appended to the URL as a query parameter (`?data=...`).
- **QR Code Sharing**: Displays a QR code of the current URL for quick mobile/peer-to-peer sharing.

### 2. Guest Mode (The "Respondent")
- **Dynamic Decoding**: Detects the `data` parameter in the URL and switches to "Guest View."
- **Local Conversion**: Converts host's UTC slots to the guest's local timezone.
- **Side-by-Side Comparison**: Shows both Host time and Guest time for each slot.
- **Add to Calendar**: Generates an `.ics` (iCalendar) file for the selected slot.

### 3. Sharing/Tunneling
- **Local Access**: Accessible via a public URL tunnel (`localtunnel`) so teammates in the room can access the local dev server.

## Data Schema (URL Encoded)
The `data` parameter will be a Base64 encoded JSON array of UTC timestamps.
Example: `?data=WzE3MTIwOTI4MDAsIDE3MTIxMDcyMDBd` (Base64 for `[1712092800, 1712107200]`)

## Success Criteria for Demo
1. Host adds 3 slots.
2. Host shows QR code.
3. Guest scans QR code.
4. Guest sees slots in their own time.
5. Guest clicks "Add to Calendar" and gets a file.
