/**
 * @enum {number}
 */
const WorkerInfoType = {
	SETPCNT: 0,  //set parallel count
	DOWNLOAD: 1,
	UPLOAD: 2,
	CANCEL: 9,
};
/**
 * @enum {number}
 */
const StepInfoType = {
	BEGIN: 0,
	INPROGRESS: 1,
	DONE: 2,
	CANCELED: 3,
};

/**
 * @enum {number}
 */
const SWorkerAction = {
	PREPARE: 1,
	SHOWERR: 2,
	RELEASEREADER: 3,
};
