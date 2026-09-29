#!/bin/bash
HD=${HD:-0.04}
# usage: batch.sh "Name" "显示名"
N="$1"; F=GI_$(echo "$N"|tr -d ' '); cd /tmp/pmx
[ -f src/${N// /_}/m.pmx ] || python3 fetch.py "$N" >/dev/null || exit 1
python3 pmx2vrm.py "src/${N// /_}/m.pmx" "/tmp/pmx/$F.vrm" >/dev/null || exit 1
cd /tmp/head
ex=$(python3 tools/vrm2head.py /tmp/pmx/$F.vrm $F "$2" "miHoYo (MMD)" --grp mmd --noflip --hair-drop $HD --out /tmp/pmx/$F.js | grep meta | python3 -c "import json,sys;print(json.loads(sys.stdin.read()[5:])['eye'][0])") || exit 1
norm=${NORM:-0.27}
python3 tools/vrm2head.py /tmp/pmx/$F.vrm $F "$2" "miHoYo (MMD) — 仅私人使用" --grp mmd --noflip --hair-drop $HD --sc ${SC:-1.25} --out models/$F.js | head -1
rm -f /tmp/pmx/$F.vrm /tmp/pmx/$F.js; rm -rf "/tmp/pmx/src/${N// /_}"
