@echo off

doskey csr=\jdk1.8.0\jre\bin\java.exe -jar \closure-compiler\closure-compiler-v20220104.jar --charset UTF-8 --compilation_level ADVANCED_OPTIMIZATIONS --warning_level VERBOSE $*
set ndp=\closure-compiler\contrib\nodejs\
set ndextp=--externs %ndp%
set externs=%ndextp%globals.js %ndextp%stream.js %ndextp%events.js %ndextp%buffer.js --externs closure\cryptojs-extern.js --externs closure\zb-externs.js
set jss=--js closure\zb-define.js --js js\zbcommon.js --js js\zbcrypto.js --js js\zbidxdb.js --js js\zbonedrive.js --js js\const.js --js js\worker-const.js --js js\settings.js --js js\main.js --js js\downup.js --js js\main-assign.js --js js\event.js

rem main
rem csr %externs% --checks_only %jss%
csr %externs% %jss% --define WORKER_PATH='' --js_output_file index.js

rem worker-sub
set jss1=--js closure\zb-worker-imp.js --js closure\zb-define.js --js js\zbcommon.js --js js\zbcrypto.js --js js\zbidxdb.js --js js\zbonedrive.js --js js\const.js --js js\worker-const.js --js js\downup.js --js js\worker-sub.js
csr %externs% %jss1% --define FOROUTPUT --js_output_file worker-sub.js

rem worker
set jss2=--js js\worker-const.js --js js\worker.js
csr %externs% %jss2% --define FOROUTPUT --js_output_file worker.js
