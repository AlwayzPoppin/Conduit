const https = require('https');
const fs = require('fs');
const path = require('path');

const url = 'https://unpkg.com/@vscode/webview-ui-toolkit@1.4.0/dist/toolkit.min.js';
const dest = path.join(__dirname, 'assets', 'toolkit.min.js');

const file = fs.createWriteStream(dest);

https.get(url, (response) => {
    if (response.statusCode === 302 || response.statusCode === 301) {
        console.log(`Redirecting to ${response.headers.location}`);
        https.get(response.headers.location, (redirectResponse) => {
            redirectResponse.pipe(file);
            file.on('finish', () => {
                file.close();
                console.log('Download completed: toolkit.min.js');
            });
        });
    } else {
        response.pipe(file);
        file.on('finish', () => {
            file.close();
            console.log('Download completed: toolkit.min.js');
        });
    }
}).on('error', (err) => {
    fs.unlink(dest);
    console.error(`Error: ${err.message}`);
});
