#!/bin/bash

# JIRA Sync Hub Startup Script
echo "========================================="
echo "   Starting JIRA Sync Hub Development    "
echo "========================================="

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo "📦 Installing npm dependencies..."
  npm install
else
  echo "✅ dependencies already installed."
fi

echo "🚀 Starting local development server..."
npm run dev
