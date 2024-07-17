import yaml from 'js-yaml';
import dotenv from 'dotenv';
import tpl from "string-template";

// Load environment variables from .env file
dotenv.config();

// Get document, or throw exception on error
const treeConfig = tpl(`
base_url: {BASE_URL}
credentials:
  accessKeyId: {AWS_ACCESS_KEY_ID}
  secretAccessKey: {AWS_SECRET_ACCESS_KEY}
`, process.env);

let config;
try {
    config = yaml.load(treeConfig);
} catch (e) {
    console.log(e);
}
export default config;