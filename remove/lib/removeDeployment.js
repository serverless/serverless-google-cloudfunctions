'use strict';

module.exports = {
  removeDeployment() {
    this.serverless.cli.log('Removing deployment...');

    const deploymentName = `sls-${this.serverless.service.service}-${this.options.stage}`;

    const params = {
      project: this.serverless.service.provider.project,
      deployment: deploymentName,
    };

    return this.provider
      .request('deploymentmanager', 'deployments', 'delete', params)
      .then(() => this.monitorDeployment(deploymentName, 'remove', 5000));
  },
};
