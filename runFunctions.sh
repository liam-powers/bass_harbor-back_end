#!/bin/bash

# open first terminal window and run back-end
osascript <<EOF
tell application "iTerm"
    create window with default profile
    tell current session of current window
        write text "cd Code/projects/Bass_Harbor/back_end/functions && npm run-script build && firebase emulators:start"
    end tell
end tell
EOF