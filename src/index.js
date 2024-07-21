import config from './config.js';
import https from 'https';
import { URL } from 'url';
import mime from 'mime';
import { promises as fs } from 'fs';

const PKG_NAME = process.env.PKG_NAME;
const PKG_VERSION = process.env.PKG_VERSION;

// Generic function to handle HTTPS requests
const httpsRequest = (method, url, headers = {}, body = null) => {
    return new Promise((resolve, reject) => {
        const { hostname, pathname } = new URL(url);
        const options = {
            hostname,
            path: pathname,
            method,
            headers,
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve(data));
        });

        req.on('error', (err) => reject(err));

        if (body) {
            req.write(body);
        }

        req.end();
    });
};

export const index = async () => {
    try {
        const data = await httpsRequest('GET', config.base_url, config.credentials);
        return JSON.parse(data);
    } catch (err) {
        throw new Error(`Unable to list files ${err.error}`);
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

export const newerPackages = async () => {

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

    const checkFileNotOnDisk = async (file) => {
        try {
            await fs.access(file);
            return false; // File exists
        } catch (err) {
            return true; // File does not exist
        }
    };

    const files = await index();
    const versions = files
        .filter(file => getVersion(file))
        .map(file => getVersion(file));



    // If new versions are available, download them from S3
    if(!!PKG_VERSION){
        const newerVersions = versions
            .filter(version => isVersionNewer(version, PKG_VERSION));

        const filterFilesAsync = async (files, newerVersions) => {
            const fileChecks = await Promise.all(files.map(async file => {
                const versionCheck = newerVersions.includes(getVersion(file));
                const notOnDiskCheck = await checkFileNotOnDisk(file);
                return versionCheck && notOnDiskCheck;
            }));

            return files.filter((_, index) => fileChecks[index]);
        };

        return await filterFilesAsync(files, newerVersions);
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

export default {index, download, upload, newerPackages};


