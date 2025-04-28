#!/bin/bash

# Install node-fetch v2 (v3 is ESM only)
# We use v2 to maintain compatibility with CommonJS
cd "$(dirname "$0")/.."
npm install --save node-fetch@2 