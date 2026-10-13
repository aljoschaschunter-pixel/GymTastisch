# GymTastisch

A small workout tracker for the iPhone, built as a web app (PWA), so it needs no App Store.

- Exercise list with ~40 common exercises, your own exercises, photos and notes
- Log sets as weight × reps, prefilled from last time
- Rest timer starts automatically after each set, keeps the screen on and beeps over your music
- Progress per exercise: estimated 1RM, top weight, volume and new-record badges
- German and English
- Works offline; data stays on the phone, with JSON backup export and import

## Install on iPhone

Open the app's address in Safari, tap **Share → Add to Home Screen**, then start it from the home screen icon.

## Development

```sh
npm install
npm run dev      # local dev server
npm run build    # production build into dist/
```

Pushing to `main` builds and deploys to GitHub Pages (`.github/workflows/deploy.yml`).
In the repo settings, **Pages → Build and deployment → Source** must be set to **GitHub Actions**.

## What a web app can't do on iOS

- No vibration (Safari has no Vibration API).
- When the phone is locked, the timer can't beep; the app shows "rest's over" when you come back.
  A lock-screen notification would need Web Push plus a small server (possible later).
