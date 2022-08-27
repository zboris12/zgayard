@echo off

set csr=\jdk1.8.0\jre\bin\java.exe -jar \closure-compiler\closure-compiler-v20220104.jar --charset UTF-8 --compilation_level ADVANCED_OPTIMIZATIONS --warning_level VERBOSE --language_out ECMASCRIPT_2015
doskey csr=%csr% $*
set ndp=\closure-compiler\contrib\nodejs\
set ndextp=--externs %ndp%
set externs=%ndextp%globals.js %ndextp%stream.js %ndextp%events.js %ndextp%buffer.js --externs closure\cryptojs-extern.js --externs closure\zb-externs.js

rem main
set src=src
set jss=--js closure\zb-define.js --js %src%\js\const.js --js %src%\js\zbcommon.js --js %src%\js\zbcrypto.js --js %src%\js\zbidxdb.js --js %src%\js\zbdrive.js --js %src%\js\zbonedrive.js --js %src%\js\zbgoogledrive.js --js %src%\js\zbidxbdrive.js --js %src%\js\worker-const.js --js %src%\js\downup.js --js %src%\js\settings.js --js %src%\js\main.js --js %src%\js\main-assign.js --js %src%\js\event.js
echo $
set chkj=%%externs%% --checks_only %%jss%%
echo chkj=csr %chkj%
doskey chkj=%csr% %chkj%
set csrj=%%externs%% %%jss%% --define WORKER_PATH='' --js_output_file %src%\index.js
echo csrj=csr %csrj%
doskey csrj=%csr% %csrj%

rem worker-sub
set jss1=--js closure\zb-worker-imp.js --js closure\zb-define.js --js %src%\js\const.js --js %src%\js\zbcommon.js --js %src%\js\zbcrypto.js --js %src%\js\zbidxdb.js --js %src%\js\zbdrive.js --js %src%\js\zbonedrive.js --js %src%\js\zbgoogledrive.js --js %src%\js\zbidxbdrive.js --js %src%\js\worker-const.js --js %src%\js\downup.js --js %src%\js\worker-sub.js
set csrj1=%%externs%% %%jss1%% --define FOROUTPUT --js_output_file %src%\worker-sub.js
echo csrj1=csr %csrj1%
doskey csrj1=%csr% %csrj1%

rem worker
set jss2=--js %src%\js\worker-const.js --js %src%\js\worker.js
set csrj2=%%externs%% %%jss2%% --define FOROUTPUT --js_output_file %src%\worker.js
echo csrj2=csr %csrj2%
doskey csrj2=%csr% %csrj2%
