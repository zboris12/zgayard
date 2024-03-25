# !/bin/bash
# set -x

npx tailwindcss -i tw/input.css -o src/index.css
RET=$?
if [ ${RET} -ne 0 ]
then
	exit 1
fi
cp -rf src/js/index.js src/
cp -rf src/js/sw.js src/
npx wrangler pages dev src --compatibility-flags=nodejs_compat --port 10801
