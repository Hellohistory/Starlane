#!/bin/sh

DATA_DIR="/usr/share/nginx/html/data"
CONFIG_FILE="$DATA_DIR/config.json"
DEFAULT_CONFIG="/app/default-config.json"

if [ ! -d "$DATA_DIR" ]; then
  mkdir -p "$DATA_DIR"
fi

if [ ! -f "$CONFIG_FILE" ]; then
  echo "Configuration file not found. Copying default config to $CONFIG_FILE"
  cp "$DEFAULT_CONFIG" "$CONFIG_FILE"
fi

echo "Starting config saver in the background..."
/usr/local/bin/config-saver &

echo "Starting Nginx in the foreground..."
exec "$@"