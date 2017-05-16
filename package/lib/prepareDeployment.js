'use strict';

/* eslint no-use-before-define: 0 */

const path = require('path');

const _ = require('lodash');
const BbPromise = require('bluebird');

module.exports = {
  prepareDeployment() {
    let deploymentTemplate = this.serverless.service.provider.compiledConfigurationTemplate;

    deploymentTemplate = this.serverless.utils.readFileSync(
      path.join(
        __dirname,
        '..',
        'templates',
        'core-configuration-template.yml'));

    const bucket = deploymentTemplate.resources.find(findDeploymentBucket);

    const name = this.serverless.service.provider.deploymentBucketName;
    const updatedBucket = updateBucketName(bucket, name);

    const bucketIndex = deploymentTemplate.resources.findIndex(findDeploymentBucket);

    deploymentTemplate.resources[bucketIndex] = updatedBucket;

    this.serverless.service.provider.compiledConfigurationTemplate = deploymentTemplate;

    return BbPromise.resolve();
  },
};

const updateBucketName = (bucket, name) => {
  const newBucket = _.cloneDeep(bucket);
  newBucket.name = name;
  return newBucket;
};

const findDeploymentBucket = (resource) => {
  const type = 'storage.v1.bucket';
  const name = 'will-be-replaced-by-serverless';

  return resource.type === type && resource.name === name;
};
