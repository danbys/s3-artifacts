# s3-artifacts

Upload artifacts to S3, create credentials to allow easy access for installing and updating services.

## AWS CloudFormation

The CloudFormation template creates an S3 bucket and a user with permissions to upload files to the bucket.

## CI/CD Pipeline

The CI/CD pipeline is triggered on every push to the repository. It builds the project and uploads the artifact to the
S3 bucket.

## Bootstrapping

All builds and necessary files to install your service are stored in `s3://enit-builds/s3-artifacts`. Request credentials
from the DevOps team to get access the S3 bucket.

## Download new builds

Every time service is started, new builds are downloaded. Only edit WinSW configuration file to point to the new build.