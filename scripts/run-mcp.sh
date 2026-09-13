#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$DIR"

exec node --conditions=react-server --env-file=.env --import tsx scripts/mcp-stdio.ts
