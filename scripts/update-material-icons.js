const fs = require('node:fs');
const path = require('node:path');
const icons = [
  "account_tree",
  "add_circle",
  "analytics",
  "api",
  "apps",
  "arrow_drop_down",
  "arrow_drop_up",
  "breaking_news_alt_1",
  "cancel",
  "change_circle",
  "check_circle",
  "close",
  "collapse_content",
  "copy_all",
  "delete",
  "delete_forever",
  "description",
  "do_not_disturb_on",
  "drag_indicator",
  "edit",
  "error",
  "expand_content",
  "first_page",
  "folder_shared",
  "format_quote",
  "get_app",
  "help",
  "history",
  "home",
  "info",
  "integration_instructions",
  "last_page",
  "list",
  "list_alt",
  "location_on",
  "location_off",
  "login",
  "navigate_before",
  "navigate_next",
  "note_add",
  "overview",
  "person",
  "place",
  "public",
  "public_off",
  "rss_feed",
  "schedule",
  "search",
  "settings",
  "stream",
  "task_alt",
  "tune",
  "unarchive",
  "unfold_more",
  "upload",
  "warning",
  "web_stories",
  "workspace_premium"
];

updateMaterialIcons();

/**
 * Gets the list of icons from google server and saves it as a font under /assets/fonts/material-icons/material_icon_subset.woff
 * run with 'node update-material-icons.js'

 The following link contains the required icons in the icon_names parameter and will return a CSS file from Google, which contains a URL to the required font WOFF file.
 This WOFF file must be downloaded and added to assets/material-icons.
 BEWARE: The list of icon names in the URL must be 100% correct and sorted alphanumerically!!!
 https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@48,500,0,0&icon_names=account_tree,apps,cancel,check_circle,copy_all,delete,delete_forever,edit,error,first_page,folder_shared,get_app,help,home,info,last_page,list,navigate_before,navigate_next,note_add,place,public_off,schedule,search,task_alt,tune,upload,warning,web_stories,workspace_premium"
 */
function updateMaterialIcons() {
  const iconParams = icons.sort().join(",");
  const googleCssUrl = "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@48,500,0,0&icon_names=" + iconParams;
  console.log("Trying to fetch CSS from " + googleCssUrl)
  fetch(googleCssUrl)
    .then(
      res =>  res.text()
    ).then(
      css => {
        const regex = /url\((https:\/\/fonts\.gstatic\.com[^\)]+)\)/;
        const match = css.match(regex);
        const url = match ? match[1] : null;
        if(url) {
          console.log("Found font url in CSS " + url)
          downloadAndSave(url);
        }
        else console.error("No font url found in CSS")
      }
  )
}

function downloadAndSave(url) {
  console.log("Trying to download font file from " + url)
  fetch(url).then(
    res =>
      res.blob()
    ).then(
      fontBlob => fontBlob.arrayBuffer()
  ).then(
      fontArrayBuffer => {

        const fontBuffer = Buffer.from(fontArrayBuffer);
        const scriptDir = __dirname; // folder where this script file resides
        const root = path.resolve(scriptDir, '..'); // adjust as needed to reach repo root
        const srcDir = path.join(root, 'src');
        const iconDir = path.join(srcDir, 'assets/fonts/material-icons/', 'material_icons_subset.woff');

        console.log("Writing icon font to file " + iconDir);
        fs.writeFile(iconDir, fontBuffer, (err) => {if (err) console.error(err)});
        console.log("Done!");
      }
  )
}
