#!/bin/bash
# Start local web server for testing

cd "$(dirname "$0")"

echo "========================================="
echo "Starting local web server..."
echo "========================================="
echo ""
echo "Open your browser and go to:"
echo "  http://localhost:8080/materials.html"
echo ""
echo "Press Ctrl+C to stop the server"
echo "========================================="
echo ""

python3 -m http.server 8080
