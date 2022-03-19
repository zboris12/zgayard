@echo off

set csr=\jdk1.8.0\jre\bin\java.exe -jar \closure-compiler\closure-compiler-v20220104.jar --charset UTF-8 --compilation_level ADVANCED_OPTIMIZATIONS --warning_level VERBOSE --language_out ECMASCRIPT_2015
doskey csr=%csr% $*
set ndp=\closure-compiler\contrib\nodejs\
set ndextp=--externs %ndp%
set externs=%ndextp%globals.js %ndextp%stream.js %ndextp%events.js %ndextp%buffer.js --externs closure\cryptojs-extern.js --externs closure\zb-externs.js

rem main
set jss=--js closure\zb-define.js --js js\const.js --js js\zbcommon.js --js js\zbcrypto.js --js js\zbidxdb.js --js js\zbdrive.js --js js\zbonedrive.js --js js\zbgoogledrive.js --js js\worker-const.js --js js\downup.js --js js\settings.js --js js\main.js --js js\main-assign.js --js js\event.js
echo $
set chkj=%%externs%% --checks_only %%jss%%
echo chkj=csr %chkj%
doskey chkj=%csr% %chkj%
set csrj=%%externs%% %%jss%% --define WORKER_PATH='' --js_output_file index.js
echo csrj=csr %csrj%
doskey csrj=%csr% %csrj%

rem worker-sub
set jss1=--js closure\zb-worker-imp.js --js closure\zb-define.js --js js\const.js --js js\zbcommon.js --js js\zbcrypto.js --js js\zbidxdb.js --js js\zbdrive.js --js js\zbonedrive.js --js js\zbgoogledrive.js --js js\worker-const.js --js js\downup.js --js js\worker-sub.js
set csrj1=%%externs%% %%jss1%% --define FOROUTPUT --js_output_file worker-sub.js
echo csrj1=csr %csrj1%
doskey csrj1=%csr% %csrj1%

rem worker
set jss2=--js js\worker-const.js --js js\worker.js
set csrj2=%%externs%% %%jss2%% --define FOROUTPUT --js_output_file worker.js
echo csrj2=csr %csrj2%
doskey csrj2=%csr% %csrj2%
