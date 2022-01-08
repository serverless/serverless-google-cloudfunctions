'use strict';

const fs = require('fs');

module.exports = {
  uploadArtifacts() {
    if (this.provider.progress) {
      this.provider.progress.get('deploy').update('Uploading artifacts');
    } else {
      this.serverless.cli.log('Uploading artifacts...');
    }

    const params = {
      bucket: this.serverless.service.provider.deploymentBucketName,
      resource: {
        name: this.serverless.service.package.artifactFilePath,
        contentType: 'application/octet-stream',
      },
      media: {
        mimeType: 'application/octet-stream',
        body: fs.createReadStream(this.serverless.service.package.artifact),
      },
    };

    return this.provider.request('storage', 'objects', 'insert', params).then(() => {
      if (!this.provider.progress) {
        this.serverless.cli.log('Artifacts successfully uploaded...');
      }
    });
  },
};
