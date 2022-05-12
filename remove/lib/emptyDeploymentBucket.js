'use strict';

const BbPromise = require('bluebird');

module.exports = {
  emptyDeploymentBucket() {
    return BbPromise.bind(this).then(this.getObjectsToRemove).then(this.removeObjects);
  },

  getObjectsToRemove() {
    const params = {
      bucket: this.serverless.service.provider.deploymentBucketName,
    };

    return this.provider.request('storage', 'objects', 'list', params).then((response) => {
      if (!response.items || !response.items.length) return BbPromise.resolve([]);

      return BbPromise.resolve(response.items);
    });
  },

  removeObjects(objectsToRemove) {
    if (!objectsToRemove.length) return BbPromise.resolve();

    if (this.log) {
      this.provider.progress.get('remove').update('Removing artifacts from deployment bucket');
    } else {
      this.serverless.cli.log('Removing artifacts in deployment bucket...');
    }

    const removePromises = objectsToRemove.map((object) => {
      const params = {
        bucket: object.bucket,
        object: object.name,
      };
      return this.provider.request('storage', 'objects', 'delete', params);
    });

    return BbPromise.all(removePromises);
  },
};
