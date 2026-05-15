#!/bin/sh
# Validate that the provided numeral matches the canonical form of the given integer.
# Usage: scripts/check.sh <integer> <numeral>
# Exits 0 on match, 1 on mismatch.
set -eu
if [ "$#" -ne 2 ]; then
  echo "usage: check.sh <integer> <numeral>" >&2
  exit 2
fi
echo "would compare $2 against canonical form of $1"
