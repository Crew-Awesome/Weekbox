#!/bin/sh
# Prevent WebKitGTK Wayland explicit-sync crash (Error 71) on modern compositors
export WEBKIT_DISABLE_DMABUF_RENDERER="${WEBKIT_DISABLE_DMABUF_RENDERER:-1}"
if [ -f /usr/lib/weekbox/libweekbox-appid.so ]; then
  if [ -n "${LD_PRELOAD:-}" ]; then
    export LD_PRELOAD=/usr/lib/weekbox/libweekbox-appid.so:$LD_PRELOAD
  else
    export LD_PRELOAD=/usr/lib/weekbox/libweekbox-appid.so
  fi
fi
exec /usr/lib/weekbox/WeekBox "$@"
