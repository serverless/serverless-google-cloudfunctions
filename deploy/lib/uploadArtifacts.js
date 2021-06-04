'use strict';

const fs = require('fs');
const _ = require('lodash');
const BbPromise = require('bluebird');
const path = require('path');
const filesize = require('filesize');

module.exports = {
  uploadArtifacts() {
    this.serverless.cli.log('Uploading artifacts...');

    const functionNames = this.serverless.service.getAllFunctions();
    const artifactFilePaths = _.uniq(
      _.map(functionNames, (name) => {
        const functionArtifactFileName = `${name}.zip`;
        const functionObject = this.serverless.service.getFunction(name);
        functionObject.package = functionObject.package || {};
        const artifactFilePath = functionObject.package.artifact ||
          this.serverless.service.package.artifact;

        if (!artifactFilePath ||
          (this.serverless.service.artifact && !functionObject.package.artifact)) {
          if (this.serverless.service.package.individually || functionObject.package.individually) {
            const artifactFileName = functionArtifactFileName;
            return path.join(this.packagePath, artifactFileName);
          }
          return path.join(this.packagePath, `${this.provider.serverless.service.service}.zip`);
        }

        return artifactFilePath;
      }),
    );

    return BbPromise.map(artifactFilePaths, (artifactFilePath) => {
      const stats = fs.statSync(artifactFilePath);
      const fileName = path.basename(artifactFilePath);
      this.serverless.cli.log(
          `Uploading service ${fileName} file to Google Cloud Storage (${filesize(stats.size)})...`,
      );

      const params = {
        bucket: this.serverless.service.provider.deploymentBucketName,
        resource: {
          name: `${this.serverless.service.package.artifactDirectoryName}/${path.basename(artifactFilePath)}`,
          contentType: 'application/octet-stream',
        },
        media: {
          mimeType: 'application/octet-stream',
          body: fs.createReadStream(artifactFilePath),
        },
      };

      return this.provider.request('storage', 'objects', 'insert', params);
    })
      .then(() => {
        this.serverless.cli.log('Artifacts successfully uploaded...');
      });
  },
};
