'use strict';

const BbPromise = require('bluebird');

module.exports = {
  generateArtifactDirectoryName() {
    const date = new Date();
    const serviceWithStage = `${this.serverless.service.service}/${this.options.stage}`;
    const dateString = `${date.getTime().toString()}-${date.toISOString()}`;

    this.serverless.service.package.artifactDirectoryName = `serverless/${serviceWithStage}/${dateString}`;

    return BbPromise.resolve();
  },
};
