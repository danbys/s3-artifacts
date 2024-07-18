import config from './config.js';
import https from 'https';
import { URL } from 'url';
import mime from 'mime';
import {info, error} from "@danbys/log-config";
import { promises as fs } from 'fs';
import pkg from '../../../../package.json' assert { type: 'json' };
export const index = async () => {
    try {
        const data = await httpsRequest('GET', config.base_url, config.credentials);
        const files = JSON.parse(data)
        return files;
    } catch (err) {
        throw(`Unable to list files ${err.error}`);
    }
}

export const download = async (filename) => {
    try {
        const url = `${config.base_url}/${encodeURIComponent(filename)}`;
        const data = await httpsRequest('GET', url, config.credentials);
        return Buffer.from(data, 'base64');
    } catch (err) {
        throw new Error(`Unable to download ${filename}: ${err.message}`);
    }
}

export const checkForNewerVersions = async () => {

    const isVersionNewer = (version, base) => {
        const versionParts = version.split('.').map(Number);
        const baseParts = base.split('.').map(Number);

        for (let i = 0; i < versionParts.length; i++) {
            if (versionParts[i] > baseParts[i]) {
                return true;
            } else if (versionParts[i] < baseParts[i]) {
                return false;
            }
        }
        return false; // Versions are the same
    }

    const getVersion = (filename) => {
        const regex = /-(\d+\.\d+\.\d+)\.js/;
        const match = filename.match(regex);

        if (match) {
            const version = match[1]; // This is the captured version number
            return version // Outputs: 0.0.1
        }
    }
    const files = await index();
    const versions = files
        .filter(file => file.startsWith('versions/') && getVersion(file))
        .map(file => getVersion(file));

    let newerFiles

    // If new versions are available, download them from S3
    const baseVersion = pkg.version;
    const newerVersions = versions
        .filter(version => isVersionNewer(version, baseVersion));
    newerFiles = files.filter(file => newerVersions.includes(getVersion(file)));
    for (const file of newerFiles) {
        try {
            // Check if the file exists
            await fs.access(filePath);
        } catch (err1) {
            // If the file does not exist, error is thrown, then upload the file
            const bufferData = await download(file);
            try {
                await fs.writeFile(file, bufferData);
                info(`Downloaded ${file} successfully`);
            } catch (err2) {
                newerFiles = newerFiles.filter(f => f !== file);
                error(`Failed writing ${file}: ${err2}`);
            }
        }
    }

    // Log if there are newer versions on disk and give instructions how to update winsw service with the latest version
    if (newerFiles.length > 0) {
        info(`There are newer versions available: ${newerFiles.join(', ')}`);
        info(`To run a newer version, edit ${pkg.name}.xml and update the version number in the <executable> tag and restart the service.`);
    }
}

export const upload = async (bufferData, filename) => {
    try {
        const url = `${config.base_url}/${encodeURIComponent(filename)}`;
        const headers = { ...config.credentials, 'Content-Type': mime.getType(filename) || 'application/octet-stream' };
        await httpsRequest('PUT', url, headers, bufferData.toString('base64'));
    } catch (err) {
        throw new Error(`Unable to upload ${filename}: ${err.message}`);
    }
}

export default {index, download, upload, checkForNewerVersions};


