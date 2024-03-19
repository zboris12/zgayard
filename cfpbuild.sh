# !/bin/bash
# set -x

OUTFLDR=public
CORS=false
GCCOPT="--charset UTF-8 --compilation_level ADVANCED_OPTIMIZATIONS --warning_level VERBOSE --language_out ECMASCRIPT_2015"
GCCEXT="--externs closure/forge-extern.js --externs closure/zb-externs.js"
function gccJSS(){
	jss=""
	while read js
	do
		if [ "${js}" = "zb-define.js" ]
		then
			jss="${jss} --js closure/${js}"
		elif [ -n "${js}" ]
		then
			c=$(echo "${js}" | cut -b1)
			if [ "$c" != "#" ]
			then
				jss="${jss} --js src/js/${js}"
			fi
		fi
	done <<< "$1"
	npx google-closure-compiler ${GCCOPT} ${GCCEXT} ${jss} $2 --js_output_file ${OUTFLDR}/$3
	return $?
}

IDX=1
npx tailwindcss -i tw/input.css -o ${OUTFLDR}/index.css --minify
RET=$?
if [ ${RET} -ne 0 ]
then
	echo "Build step ${IDX} css failed. ${RET}"
	exit ${IDX}
else
	echo "Build step ${IDX} css succeeded."
fi

IDX=$(expr ${IDX} + 1)
SRCJSS="
zb-define.js
const.js
charutil.js
zbcommon.js
zbcrypto.js
zbidxdb.js
zbdrive.js
zbonedrive.js
zbgoogledrive.js
zbidxbdrive.js
worker-const.js
downup.js
settings.js
main.js
main-assign.js
withsw.js
event.js
"
gccJSS "${SRCJSS}" "--define WORKER_PATH='' --define CORS=${CORS}" index.js
RET=$?
if [ ${RET} -ne 0 ]
then
	echo "Build step ${IDX} js failed. ${RET}"
	exit ${IDX}
else
	echo "Build step ${IDX} js succeeded."
fi

IDX=$(expr ${IDX} + 1)
SRCJSS="
zb-define.js
const.js
zbcommon.js
zbcrypto.js
zbidxdb.js
zbdrive.js
zbonedrive.js
zbgoogledrive.js
zbidxbdrive.js
worker-const.js
downup.js
worker-sub.js
"
gccJSS "${SRCJSS}" "--define WORKER_PATH='' --define CORS=${CORS} --define FOROUTPUT" worker-sub.js
RET=$?
if [ ${RET} -ne 0 ]
then
	echo "Build step ${IDX} js failed. ${RET}"
	exit ${IDX}
else
	echo "Build step ${IDX} js succeeded."
fi

IDX=$(expr ${IDX} + 1)
SRCJSS="
worker-const.js
worker.js
"
gccJSS "${SRCJSS}" "--define FOROUTPUT" worker.js
RET=$?
if [ ${RET} -ne 0 ]
then
	echo "Build step ${IDX} js failed. ${RET}"
	exit ${IDX}
else
	echo "Build step ${IDX} js succeeded."
fi

IDX=$(expr ${IDX} + 1)
SRCJSS="
zb-define.js
const.js
zbcommon.js
zbcrypto.js
zbidxdb.js
zbdrive.js
zbonedrive.js
zbgoogledrive.js
zbidxbdrive.js
worker-const.js
sw.js
"
gccJSS "${SRCJSS}" "--define CORS=${CORS} --define FOROUTPUT" sw.js
RET=$?
if [ ${RET} -ne 0 ]
then
	echo "Build step ${IDX} js failed. ${RET}"
	exit ${IDX}
else
	echo "Build step ${IDX} js succeeded."
fi

IDX=$(expr ${IDX} + 1)
# Copy other static files
while read fil
do
	if [ -n "${fil}" ]
	then
		c=$(echo "${fil}" | cut -b1)
		if [ "$c" != "#" ]
		then
			cp -rf "src/${fil}" ${OUTFLDR}/
			RET=$?
			if [ ${RET} -ne 0 ]
			then
				echo "Build step 6 copy file failed. ${fil} ${RET}"
				exit 6
			else
				echo "Build step 6 copy file succeeded. ${fil}"
			fi
		fi
	fi
done <<< "
img
msg
vendor
favicon.ico
index.html
manifest.json
"

exit 0
