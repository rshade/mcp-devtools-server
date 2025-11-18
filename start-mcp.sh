#!/usr/bin/env bash
# Wrapper script to start MCP DevTools server with helpful error messages

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIST_FILE="$SCRIPT_DIR/dist/index.js"

if [ ! -f "$DIST_FILE" ]; then
  echo "Error: MCP DevTools server not built yet!" >&2
  echo "" >&2
  echo "Please run the following command to build the server:" >&2
  echo "  make build" >&2
  echo "" >&2
  echo "Or from the project directory:" >&2
  echo "  cd $SCRIPT_DIR && make build" >&2
  exit 1
fi

exec node "$DIST_FILE" "$@"
