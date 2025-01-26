const paypal = require('@paypal/checkout-server-sdk');
require('dotenv').config()

const environment = new paypal.core.SandboxEnvironment(
  process.env.YOUR_CLIENT_ID, 
  process.env.SECRET    
);
const Client = new paypal.core.PayPalHttpClient(environment);

module.exports = { Client };