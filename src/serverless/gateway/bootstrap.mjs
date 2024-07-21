import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
// Get the filename of the current module
const __filename = fileURLToPath(import.meta.url);
// Get the directory name of the current module
const __dirname = dirname(__filename);

const templatePath = path.join(__dirname, '..', 'bootstrap.ps1');
let template = fs.readFileSync(templatePath, 'utf-8');


export const getScript = async (event, context) => {
  try {
    const {folder} = event.pathParameters;
    if (event.headers['User-Agent'].toLowerCase().includes('powershell')) {
      // Replace the BASE_URL line
      template = template.replace(/^\$BASE_URL = "";/m, `$BASE_URL = "https://${event.requestContext.domainName}/${event.requestContext.stage}/${folder}/files";`);

    }

    return {
      statusCode: 200,
      headers: { "Content-Type": 'text/plain' }, // Set the Content-Type header
      body: template,
      //body: outputBuffer.toString("base64"),
      //isBase64Encoded: true
    };
  } catch (error) {
    console.error(error); // Log the error for server-side visibility
    return {
      statusCode: 500, // Internal Server Error status code
      headers: { "Content-Type": 'application/json' }, // Indicate the content type is JSON
      body: JSON.stringify({ message: "Internal server error", error: error.message }), // Return the error message in the body
    };
  }
}