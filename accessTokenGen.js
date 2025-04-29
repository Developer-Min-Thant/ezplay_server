const apiKey = '';
const apiSecret = '';

const accessToken = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
console.log('accessToken=', accessToken);
