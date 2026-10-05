#!/bin/bash
DIR="$(cd "$(dirname "$0")" && pwd)"
export PATH="/opt/homebrew/bin:/usr/local/bin:/opt/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"

if [ -d "$HOME/.nvm/versions/node" ]; then
  LATEST_NVM=$(ls -d "$HOME/.nvm/versions/node"/*/ 2>/dev/null | tail -n 1)
  if [ -n "$LATEST_NVM" ]; then
    export PATH="$LATEST_NVM/bin:$PATH"
  fi
fi

if [ -d "$HOME/.fnm/current/bin" ]; then
  export PATH="$HOME/.fnm/current/bin:$PATH"
fi

if [ -d "$HOME/.local/share/fnm/current/bin" ]; then
  export PATH="$HOME/.local/share/fnm/current/bin:$PATH"
fi

if [ -d "$HOME/.volta/bin" ]; then
  export PATH="$HOME/.volta/bin:$PATH"
fi

if [ -d "$HOME/.asdf/shims" ]; then
  export PATH="$HOME/.asdf/shims:$PATH"
fi

if [ -d "$HOME/n/bin" ]; then
  export PATH="$HOME/n/bin:$PATH"
fi

NODE_BIN=$(command -v node 2>/dev/null)
if [ -z "$NODE_BIN" ]; then
  for candidate in \
    /opt/homebrew/bin/node \
    /usr/local/bin/node \
    /usr/bin/node \
    /opt/local/bin/node \
    "$HOME/.nvm/versions/node"/*/bin/node \
    "$HOME/.fnm/current/bin/node" \
    "$HOME/.local/share/fnm/current/bin/node" \
    "$HOME/.volta/bin/node" \
    "$HOME/n/bin/node"; do
    if [ -x "$candidate" ]; then
      NODE_BIN="$candidate"
      break
    fi
  done
fi

if [ -n "$NODE_BIN" ]; then
  exec "$NODE_BIN" "$DIR/main.js" "$@"
else
  echo "[WeekBox] Error: Node.js executable not found in PATH" >&2
  exit 1
fi

