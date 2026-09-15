#!/bin/sh
# Stop hook. Kills any leftover dev-server processes (ng serve on 4200,
# serve:pwa's http-server on 8080) that a Bash call started in the
# background this session and forgot to stop, so a stale/conflicting
# server doesn't linger for the user after Claude finishes responding.
set -e

killed=""

for port in 4200 8080; do
  pids=$(netstat -ano 2>/dev/null | awk -v p=":$port\$" '
    $1 == "TCP" && $2 ~ p && $4 == "LISTENING" { print $NF }
  ' | sort -u)

  for pid in $pids; do
    if taskkill //F //PID "$pid" >/dev/null 2>&1; then
      killed="$killed $port(pid $pid)"
    fi
  done
done

if [ -n "$killed" ]; then
  printf '{"systemMessage": "Stopped leftover dev server(s) still listening after this turn:%s"}\n' "$killed"
fi

exit 0
