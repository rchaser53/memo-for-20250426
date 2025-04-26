const CRXServer = require('crx-server');
const path = require('path');

const crxServer = CRXServer({
    extensionDir: path.resolve(__dirname, 'extension'),
    // extensionDir: path.resolve(__dirname, '../sample-extensions/src'),
    publicDir: path.resolve(__dirname, 'public'),
    port: 8080,
    ngrok: {
        authtoken: '2wGba362Z79TlYxfrXr9bX7A1Ac_26PxpnSfe4dj4Bw5niE1W', // your authtoken from ngrok.com
    }
});

(async () => {
    await crxServer.start(true); //Start the server

    //Get the public `/update.xml` endpoint URL - this is used for deployment
    let url = crxServer.getUpdateUrl() 

    console.log({url});

    //Update the underlying package to reflect any changes
    await crxServer.update('patch');
})();