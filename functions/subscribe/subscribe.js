const jwt = require('jsonwebtoken');
const axios = require('axios');

exports.handler = async (event, context) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 200,
      body: 'Method Not Allowed' };
  }
  const errorGen = msg => {
    return {
      statusCode: 500,
      body: msg
    };
  };
  try {
    const { email } = JSON.parse(event.body);
    if (!email) {
      return errorGen('Missing Email');
    }

    // Split the key into ID and SECRET
    const key = process.env.GHOST_ADMIN_API_KEY;
    const [id, secret] = key.split(':');

    // Create the token (including decoding secret)
    const token = jwt.sign({}, Buffer.from(secret, 'hex'), {
        keyid: id,
        algorithm: 'HS256',
        expiresIn: '5m',
        audience: `/v3/admin/`
    });

    // Make an authenticated request to create a post
    const url = `${process.env.GHOST_API_URL}/ghost/api/v3/admin/members/`;
    const headers = { Authorization: `Ghost ${token}` };
    const payload = { members: [{ email: email }] };

    const response = await axios.post(url, payload, { headers });

    if (response.status >= 300 || response.status < 200) {
      return {
        statusCode: response.status,
        body: response
      };
    }
    return {
      statusCode: 200,
      body: JSON.stringify({ msg: "Successfully subscribed", success: true, duplicate: false, detail: response.data, }),
    };


  } catch (err) {
    console.log(err); // output to netlify function log
    if (err.response.status === 422) {
      return {
        statusCode: 200,
        body: JSON.stringify({ msg: "Already subscribed", success: true, duplicate: true, detail: err.response.data, }),
      };
    }
    else {
      return {
        statusCode: 500,
        body: JSON.stringify({ msg: err.message }),
      };
    }
  }
};
