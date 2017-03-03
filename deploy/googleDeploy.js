'use strict';

const BbPromise = require('bluebird');

const validate = require('../shared/validate');
const utils = require('../shared/utils');
const prepareDeployment = require('./lib/prepareDeployment');
const createDeployment = require('./lib/createDeployment');
const monitorDeployment = require('../shared/monitorDeployment');
const generateArtifactDirectoryName = require('./lib/generateArtifactDirectoryName');
const mergeServiceResources = require('./lib/mergeServiceResources');
const uploadArtifacts = require('./lib/uploadArtifacts');
const compileFunctions = require('./lib/compileFunctions');
const updateDeployment = require('./lib/updateDeployment');
const cleanupDeploymentBucket = require('./lib/cleanupDeploymentBucket');

class GoogleDeploy {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;
    this.provider = this.serverless.getProvider('google');

    Object.assign(
      this,
      validate,
      utils,
      prepareDeployment,
      createDeployment,
      monitorDeployment,
      generateArtifactDirectoryName,
      mergeServiceResources,
      uploadArtifacts,
      compileFunctions,
      updateDeployment,
      cleanupDeploymentBucket);

    this.hooks = {
      'before:deploy:initialize': () => BbPromise.bind(this)
        .then(this.validate)
        .then(this.setDefaults),

      'deploy:initialize': () => BbPromise.bind(this)
        .then(this.prepareDeployment),

      'deploy:setupProviderConfiguration': () => BbPromise.bind(this)
        .then(this.createDeployment),

      'before:deploy:compileFunctions': () => BbPromise.bind(this)
        .then(this.generateArtifactDirectoryName)
        .then(this.compileFunctions),

      'deploy:deploy': () => BbPromise.bind(this)
        .then(this.mergeServiceResources)
        .then(this.uploadArtifacts)
        .then(this.updateDeployment)
        .then(this.cleanupDeploymentBucket),
    };
  }
}

module.exports = GoogleDeploy;
