#!/bin/bash
DIR="$(cd "$(dirname "$0")" && pwd)"
export PATH="/usr/local/bin:/opt/homebrew/bin:/opt/local/bin:$PATH"

if [ -d "$HOME/.nvm/versions/node" ]; then
  LATEST_NVM=$(ls -d "$HOME/.nvm/versions/node"/*/ 2>/dev/null | tail -n 1)
  if [ -n "$LATEST_NVM" ]; then
    export PATH="$LATEST_NVM/bin:$PATH"
  fi
fi

if [ -d "$HOME/.volta/bin" ]; then
  export PATH="$HOME/.volta/bin:$PATH"
fi

if [ -d "$HOME/.asdf/shims" ]; then
  export PATH="$HOME/.asdf/shims:$PATH"
fi

NODE_BIN=$(command -v node 2>/dev/null)
if [ -z "$NODE_BIN" ]; then
  if [ -x "/usr/local/bin/node" ]; then
    NODE_BIN="/usr/local/bin/node"
  elif [ -x "/opt/homebrew/bin/node" ]; then
    NODE_BIN="/opt/homebrew/bin/node"
  fi
fi

if [ -n "$NODE_BIN" ]; then
  exec "$NODE_BIN" "$DIR/main.js" "$@"
else
  echo "[WeekBox] Error: Node.js executable not found in PATH" >&2
  exit 1
fi
