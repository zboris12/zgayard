<div align="center"><img src="https://zboris12.github.io/zgayard/src/logo.png" title="zgayard"></div>

# zgayard
Create a safety yard in your online storage. [Let's go!](https://zboris12.github.io/zgayard/src/)  

This is a web tool aimed to make your online storage more safety.  
It is a single page application and almost all processing is performed in the web browser.  
The server side is only used to handle authorization of online storage, which can't be processed in the web browser.

PS: __ZGA__ is the abbreviation of my father's name.  
And I use this name to hope the merits from this application will be dedicated to my parents.

## NOTE: it is still in development

* The UI is still very simple and ugly.
* Only support a few online storages now.

## Main features

* Manage your online storage. Include:
  * Create a new folder
  * Upload files
  * Download files
  * Rename files or folders
  * Move files or folders
  * Delete files or folders
* Encrypt file when upload to online storage. Also encrypt file's name if the setting is chosen.
* Decrypt file when download from online storage.
* Support multiple root directories with different password and key files.
* Support to upload folder.
* Support to view image file or video file directly from online storage.
* Automatically play the next video file after the current video is ended.
* Supported online storage:
  * Microsoft Onedrive
  * Google Drive

## TODO

* Make the UI cool and responsive.
* Support to download multiple files and compress them to a zip file
* More online storage support
* More language support
* Support to change key and password

## The Dependencies

* [crypto-js](https://github.com/brix/crypto-js)
* [videostream](https://github.com/jhiesey/videostream)

## The Icons

The svg icons are got from [iconsvg](https://iconsvg.xyz/).

## License

This application is available under the
[MIT license](https://opensource.org/licenses/MIT).
