# SpaceX Mission Control

**Student:** Soroush Salari
**Student ID:** 101537771
**Course:** COMP3133 - Full Stack Development II
**Lab Test 2** - Option A: SpaceX Mission Theme

## App Description

An Angular application that fetches and displays SpaceX mission data using the public SpaceX API (`api.spacexdata.com/v4`). Features an immersive 3D space scene built with Three.js as the background, with interactive mission cards, search/filter functionality, and detailed mission views with rocket specifications.

## Features Implemented

- **3D Space Scene** - Interactive Three.js background with Earth, Moon, Mars, Sun (with animated plasma shader), stars, and a Falcon 9 rocket model with engine exhaust particles
- **SpaceX API Integration** - Fetches launches and rockets from `api.spacexdata.com/v4` using Angular HttpClient
- **Search Missions** - Real-time search by mission name using FormsModule (ngModel)
- **Filter by Status** - Filter missions by ALL / SUCCESS / FAILED / UPCOMING
- **Mission Detail View** - Click any mission to see full details including rocket specs, core info, failure details, launch photos, and external links
- **Rocket Model Swap** - Hovering over mission cards swaps the 3D rocket model (Falcon 1, Falcon 9, Falcon Heavy, Starship)
- **Cinematic Camera** - Clicking a mission triggers a camera drill down the rocket with neon text overlay
- **Text-to-Speech Narration** - Automatic voice narration of mission details using Web Speech API
- **Rocket Sound Effects** - Background engine rumble sound on detail pages
- **Custom Pipe** - `TimeAgoPipe` for displaying relative dates
- **Angular Signals** - Used throughout for reactive state management
- **Responsive HUD UI** - Glassmorphism panels, animated stats, scrolling ticker

## Screenshots

### Main Page - Mission Control Dashboard
![Main Page](screenshots/main-page.png)
*3D space scene with Earth, rocket, and sun. HUD overlay shows mission stats, search, filter buttons, and scrollable mission cards at the bottom.*

### Launch Detail Page
![Launch Detail](screenshots/launch-detail.png)
*Detailed mission view with rocket specifications, core reuse info, launch status, and external links. Slide-in animation from right.*

## Angular Requirements Covered

| Requirement | Implementation |
|---|---|
| HttpClient | `SpacexService` - 4 API endpoints (launches, rockets, by ID) |
| FormsModule | Search input with ngModel two-way binding |
| ReactiveFormsModule | Imported and available |
| 2+ Components | `SpaceScene`, `MissionList`, `MissionDetail` |
| Search/Filter | Search by name + filter by status (ALL/SUCCESS/FAILED/UPCOMING) |
| TypeScript Models | `Launch`, `Rocket`, `FilterStatus` interfaces |
| Custom Pipe | `TimeAgoPipe` - converts dates to "X years ago" format |
| @for | Mission cards loop in bottom strip |
| @if | Loading states, conditional patches, detail sections |
| @switch | Filter label display (RECENT/SUCCESSFUL/FAILED/UPCOMING) |
| Signal | `launches`, `rockets`, `loading`, `searchQuery`, `filterStatus`, `hoveredRocketId`, `zoomToRocket`, `cinematicActive`, `selectedRocket`, `enabled` (TTS) |
| CSS Styling | Custom dark HUD theme with Orbitron font, glassmorphism, neon accents |

## API Endpoints Used

- `GET /v4/launches` - All SpaceX launches
- `GET /v4/rockets` - All SpaceX rockets
- `GET /v4/launches/:id` - Single launch details
- `GET /v4/rockets/:id` - Single rocket details

## Instructions to Run

```bash
# Clone the repository
git clone https://github.com/SOROUSH911/101537771_comp3133_labtest2.git
cd 101537771_comp3133_labtest2

# Install dependencies
npm install

# Start development server
ng serve

# Open in browser
http://localhost:4200
```

## Deployment

- **Vercel:** [Live Demo](https://spacex-mission-control-soroushsalari2023s-projects.vercel.app)

## Tech Stack

- Angular 21
- Three.js (3D rendering)
- SpaceX API v4
- Web Speech API (TTS)
- TypeScript
- CSS (custom HUD theme)
