import { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import mime from 'mime';
const BUCKET_NAME = 's3-artifacts-enit';

export const index = async (event, context) => {

  const { accessKeyId, secretAccessKey } = event.headers;
  const s3Client = new S3Client({
    credentials:  {
      accessKeyId: accessKeyId,
      secretAccessKey: secretAccessKey
    },
    region: "eu-north-1"
  });

  const {folder} = event.pathParameters
  const params = {
    Bucket: BUCKET_NAME,
    Prefix: folder+'/'
  };

  try {
    const command = new ListObjectsV2Command(params);
    const response = await s3Client.send(command);

    if (!response.Contents) {
      return {
        statusCode: 200,
        body: JSON.stringify([]),
      };
    }

    const folderFiles = response.Contents
      .filter((item) => item.Key && !item.Key.endsWith("/"))
      .map((item) => item.Key && item.Key.replace(folder+'/', ""))
    return {
      statusCode: 200,
      body: JSON.stringify(folderFiles),
    };
  } catch (error) {
    // Handle error
    console.log(error)
    if (error.$metadata && error.$metadata.httpStatusCode) {
      return {
        statusCode: error.$metadata.httpStatusCode,
        body: JSON.stringify({ message: error.message }),
      };
    } else {
      return {
        statusCode: 500,
        body: JSON.stringify({
          message: `Error listing folder files`,
          error: error.message,
        }),
      };
    }
  }
};

export const download = async (event, context) => {
  const { accessKeyId, secretAccessKey } = event.headers;
  const s3Client = new S3Client({
    credentials:  {
      accessKeyId: accessKeyId,
      secretAccessKey: secretAccessKey
    },
    region: "eu-north-1"
  });

  const {folder, filename} = event.pathParameters

  const params = {
    Bucket: BUCKET_NAME,
    Key: `${folder}/${decodeURIComponent(filename)}`
  };

  try {
    const command = new GetObjectCommand(params);
    const response = await s3Client.send(command);
    const { Body, ContentType } = response;

    const buffer = await new Promise((resolve, reject) => {
      const chunks = [];
      Body.on("data", (chunk) => chunks.push(chunk));
      Body.on("end", () => {
        // Concatenate all the chunks into a single Buffer
        resolve(Buffer.concat(chunks));
      });
      Body.on("error", reject);
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": ContentType }, // Set the Content-Type header
      body: buffer.toString("base64"),
      isBase64Encoded: true, // Indicate that the body is base64-encoded
    };
  } catch (error) {
    // Handle error
    if (error.$metadata && error.$metadata.httpStatusCode) {
      return {
        statusCode: error.$metadata.httpStatusCode,
        body: JSON.stringify({ message: error.message }),
      };
    } else {
      return {
        statusCode: 500,
        body: JSON.stringify({
          message: `Error fetching object as buffer`,
          error: error.message,
        }),
      };
    }
  }
}

export const upload = async (event, context) => {
  const { accessKeyId, secretAccessKey } = event.headers;
  const s3Client = new S3Client({
    credentials: {
      accessKeyId: accessKeyId,
      secretAccessKey: secretAccessKey
    },
    region: "eu-north-1"
  });

  const { folder, filename } = event.pathParameters;
  const fileContent = Buffer.from(event.body, 'base64'); // Assuming the body contains base64-encoded file content
  const contentType = mime.getType(filename) || 'application/octet-stream';

  const params = {
    Bucket: BUCKET_NAME,
    Key: `${folder}/${decodeURIComponent(filename)}`,
    Body: fileContent,
    ContentType: contentType
  };

  try {
    await s3Client.send(new PutObjectCommand(params));
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "File uploaded successfully" }),
    };
  } catch (error) {
    console.error("Error uploading file:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Error uploading file", error: error.message }),
    };
  }
};