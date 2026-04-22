const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const NODE_ENV = process.env.NODE_ENV === 'production' ? 'production' : 'development';
const envFileName = `.env.${NODE_ENV}`;
const resolvedEnvPath = path.resolve(__dirname, '..', envFileName);

if (!fs.existsSync(resolvedEnvPath)) {
  throw new Error(`Environment file not found: ${envFileName}`);
}

dotenv.config({
  path: resolvedEnvPath,
  override: true
});

module.exports = {
  NODE_ENV,
  envFileName,
  resolvedEnvPath
};
