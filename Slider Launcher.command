#!/bin/bash

# =======================================
# Slider App - Desktop Launcher
# =======================================
# This script launches a terminal with the slider app launcher

# Detect the terminal application to use
if command -v iTerm &>/dev/null; then
  # Use iTerm if available
  osascript <<EOF
tell application "iTerm"
  create window with default profile
  tell current session of current window
    write text "cd $PWD && ./slider.sh"
  end tell
end tell
EOF
elif command -v Terminal &>/dev/null; then
  # Use Terminal.app as fallback
  osascript <<EOF
tell application "Terminal"
  do script "cd $PWD && ./slider.sh"
end tell
EOF
else
  # Direct execution as last resort
  exec "$PWD/slider.sh"
fi
