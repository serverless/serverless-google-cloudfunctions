'use strict';

/* eslint no-use-before-define: 0 */

const path = require('path');

const BbPromise = require('bluebird');

module.exports = {
  saveCreateTemplateFile() {
    const filePath = path.join(
      this.serverless.config.servicePath,
      '.serverless',
      'configuration-template-create.yml'
    );

    this.serverless.utils.writeFileSync(
      filePath,
      this.serverless.service.provider.compiledConfigurationTemplate
    );

    return BbPromise.resolve();
  },

  saveUpdateTemplateFile() {
    const filePath = path.join(
      this.serverless.config.servicePath,
      '.serverless',
      'configuration-template-update.yml'
    );

    this.serverless.utils.writeFileSync(
      filePath,
      this.serverless.service.provider.compiledConfigurationTemplate
    );

    return BbPromise.resolve();
  },
};
