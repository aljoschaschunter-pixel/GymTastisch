# GymTastisch

A simple, free workout tracker that runs in the browser and installs on your phone like an app.

## Features

- **Training days:** save up to 7 days (e.g. "Monday · Day 1") with a fixed set of exercises and start them with one tap
- **Progressive overload:** your first set decides the weight for next time, based on your target rep range (default 8–12)
- **Quick logging:** weight × reps with +/− buttons, prefilled from last time
- **Rest timer:** starts automatically after each set, keeps the screen on and plays a short beep over your music
- **40 illustrated exercises**, plus your own exercises with photos and notes
- **Progress:** chart per exercise (estimated 1RM, top weight, volume) and new-record badges
- **History** of all workouts
- **German and English**
- **Works offline;** your data stays on your phone, with backup export and import

## Install

**iPhone:** open the app in Safari, tap **Share → Add to Home Screen**, then open it from the new icon.

**Android:** open the app in Chrome, tap the **⋮ menu → Install app** (or **Add to Home screen**), then open it from the new icon.

## Development

```sh
npm install
npm run dev      # local dev server
npm run build    # production build into dist/
```

Every push to `main` is built and published with GitHub Pages.
