#!/usr/bin/env bash
# Launch Night of the Dead (native C# + Rust AI + Raylib)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
PROJ="$ROOT/native/NightOfTheDead"
export PATH="${HOME}/.cargo/bin:${PATH}"
cd "$PROJ"
if [[ ! -f bin/Release/net10.0/NightOfTheDead.dll ]]; then
  echo "Building Release…"
  dotnet build -c Release
fi
# Ensure Rust lib is findable for P/Invoke
export LD_LIBRARY_PATH="$PROJ/bin/Release/net10.0:$PROJ:${LD_LIBRARY_PATH:-}"
exec dotnet bin/Release/net10.0/NightOfTheDead.dll "$@"
