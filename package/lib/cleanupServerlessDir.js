'use strict';

const BbPromise = require('bluebird');
const path = require('path');
const fse = require('fs-extra');

module.exports = {
  cleanupServerlessDir() {
    if (this.serverless.config.servicePath) {
      const serverlessDirPath = path.join(this.serverless.config.servicePath, '.serverless');

      if (fse.pathExistsSync(serverlessDirPath)) {
        fse.removeSync(serverlessDirPath);
      }
    }

    return BbPromise.resolve();
  },
};
