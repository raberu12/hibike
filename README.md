# Ukulele Tuner

A clean Vite + React + TypeScript base for a real-time ukulele tuner styled with Tailwind CSS.

## Features

- Web Audio API microphone capture
- Readable autocorrelation pitch detection
- Ukulele note mapping for G4, C4, E4, and A4
- Cents deviation and Flat / Sharp / In Tune status
- Smoothed frequency readings for steadier UI updates
- Tuning meter and SVG string visualizer placeholder

## Development

```bash
npm install
npm run dev
```

## Verification

```bash
npm run lint
npm run build
```

Microphone access requires a secure context in browsers, such as `localhost` during development or HTTPS in production.
