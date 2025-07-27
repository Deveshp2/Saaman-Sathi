@echo off
echo Starting React development server with increased memory...
set NODE_OPTIONS=--max-old-space-size=8192
npm run start:memory
