#!/bin/bash
# 夜間の不具合巡回：_check/*.js を1本ずつ流し、結果を1行ずつ記録する。
#   使い方: _check/_tools/nightrun.sh <締め切りUTC epoch 秒> [結果ファイル]
#   締め切りを過ぎたら残りは流さず「SKIP」と記す（決められた時間帯の中で終えるため）。
#   ★同時に流すと機械が混み合って誤判定が出る（§197）。必ず1本ずつ。
cd "$(dirname "$0")/../.."
DEADLINE=${1:-0}; LOG=${2:-/tmp/night_results.txt}; CHUNK=${3:-0}
# ★セッションが待ち状態になると入れ物（コンテナ）ごと眠るので、裏で回しても止まる。
#   前面で「1回の呼び出し＝CHUNK秒まで」を何度も呼ぶ。RESUME=1 なら記録を消さず、済んだ検査は飛ばす。
[ "${RESUME:-0}" = "1" ] || : > "$LOG"
T0=$(date +%s)
(curl -s -o /dev/null -m 3 http://127.0.0.1:8899/ver.txt || (setsid nohup python3 -m http.server 8899 --directory "$PWD" >/dev/null 2>&1 &)); sleep 1
for f in $(ls _check/*.js | grep -v -E "mkland|mkbefore|stub3"); do
  n=$(basename "$f" .js)
  grep -q "| $n |" "$LOG" 2>/dev/null && continue
  if [ "$CHUNK" -gt 0 ] && [ $(( $(date +%s) - T0 )) -ge "$CHUNK" ]; then echo "CHUNK_END"; exit 0; fi
  if [ "$DEADLINE" -gt 0 ] && [ "$(date +%s)" -ge "$DEADLINE" ]; then echo "SKIP | $n | 締め切り" >> "$LOG"; continue; fi
  out=$(timeout 420 node "$f" 2>&1); rc=$?
  ng=$(echo "$out" | grep -cE '★NG[[:space:]]+[^0-9]|★NG$|★NG [^0-9]')
  sum=$(echo "$out" | tail -1 | cut -c1-120)
  if [ $rc -eq 124 ]; then st="TIMEOUT"; elif [ $rc -ne 0 ]; then st="ERR"; elif [ "$ng" -gt 0 ]; then st="NG($ng)"; else st="OK"; fi
  echo "$st | $n | $sum" >> "$LOG"
  if [ "$st" != "OK" ]; then echo "$out" | grep -E '★NG|Error|error' | head -8 | sed 's/^/     /' >> "$LOG"; fi
done
echo "=== DONE $(date -u) ===" >> "$LOG"; echo "ALL_DONE"
