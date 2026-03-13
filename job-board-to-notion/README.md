# Job Board to Notion

A minimal Chrome Extension (Manifest V3) that extracts job details from supported boards and saves them to your Notion database.

## Load Unpacked Extension
1. Open Chrome and go to `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select the `job-board-to-notion/` folder.

## Configure Notion Settings
1. Open the extension popup.
2. Paste your **Notion integration token** and **Database ID**.
3. Click **Save settings**.
4. Click **Test Notion connection** to validate access and property mappings.

## Test on Each Site
- LinkedIn: open a job page under `https://www.linkedin.com/jobs/` and click **Extract current page**.
- Cake: open a job page on `https://www.cake.me/` and click **Extract current page**.
- 104: open a job page on `https://www.104.com.tw/` and click **Extract current page**.

## Known Limitations
- Selectors may break if job board DOMs change.
- Some job pages might not include the company name in the initial DOM.
- The extension stores the Notion token locally in Chrome storage.

## Security Note
Storing a Notion token inside a client-side extension is convenient but **not ideal for production**. Anyone with access to the browser profile can extract the token. For a production-grade system, prefer routing requests through a backend proxy that enforces authentication and rate limits.

## Next Steps (Backend Proxy)
- Move Notion calls to a server endpoint you control.
- Replace the direct Notion API call with a `fetch` to your backend.
- Use the extension only for extraction and send the job payload to your server.

## Project Structure
```
job-board-to-notion/
  manifest.json
  background.js
  popup.html
  popup.js
  styles.css
  content/
    linkedin.js
    cake.js
    104.js
    extractor.js
  lib/
    notion.js
    utils.js
  icons/
  README.md
```
