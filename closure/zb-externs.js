/**
 * @fileoverview This is an externs file.
 * @externs
 */

/**
 * @typedef
 * {{
 *    type: WorkerInfoType,
 *    palcnt: (number|undefined),
 *    rowIdx: (number|undefined),
 *    cominf: (WorkerCommonInfo|undefined),
 *    downinf: (WorkerDownloadInfo|undefined),
 *    upinf: (WorkerUploadInfo|undefined),
 * }}
 */
var WorkerInfo;
/**
 * @typedef
 * {{
 *    gtoken: string,
 *    iv: string,
 *    key: string,
 *    drvid: string,
 * }}
 */
var WorkerCommonInfo;
/**
 * @typedef
 * {{
 *    fname: string,
 *    file: File,
 *    ptid: string,
 * }}
 */
var WorkerUploadInfo;
/**
 * @typedef
 * {{
 *    targetId: string,
 * }}
 */
var WorkerDownloadInfo;
/**
 * @typedef
 * {{
 *    type: StepInfoType,
 *    wtype: WorkerInfoType,
 *    rowIdx: (number|undefined),
 *    begin: (number|undefined),
 *    spd: (number|undefined),
 *    posn: (number|undefined),
 *    size: number,
 *    blob: (!Blob|undefined),
 *    errr: (string|undefined),
 *    gtoken: (string|undefined),
 *    fined: (boolean|undefined),
 * }}
 */
var WorkerStepInfo;

/**
 * @typedef
 * {{
 *    action: SWorkerAction,
 *    cominf: (WorkerCommonInfo|undefined),
 *    msg: (string|undefined),
 * }}
 */
var SWActionInfo;
