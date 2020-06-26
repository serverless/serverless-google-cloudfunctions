'use strict';

const _ = require('lodash');
const BbPromise = require('bluebird');

module.exports = {
  setIamPolicy() {
    return BbPromise.bind(this).then(this.getFunctions).then(this.setPolicies);
  },

  getFunctions() {
    const project = this.serverless.service.provider.project;
    const region = this.options.region;

    const params = {
      parent: `projects/${project}/locations/${region}`,
    };

    return this.provider
      .request('cloudfunctions', 'projects', 'locations', 'functions', 'list', params)
      .then((response) => {
        return response.functions;
      });
  },

  setPolicies(functions) {
    const policies = this.serverless.service.provider.functionIamBindings;

    // If there are no IAM policies configured with any function, there is nothing to
    // do here.
    if (!policies || !Object.keys(policies).length) {
      return BbPromise.resolve();
    }
    this.serverless.cli.log('Setting IAM policies...');

    _.forEach(policies, (value, key) => {
      const func = functions.find((fn) => {
        return fn.name === key;
      });
      if (func) {
        const params = {
          resource: func.name,
          requestBody: {
            policy: {
              bindings: value,
            },
          },
        };

        this.provider.request(
          'cloudfunctions',
          'projects',
          'locations',
          'functions',
          'setIamPolicy',
          params
        );
      } else {
        const errorMessage = [
          `Unable to set IAM bindings (${value}) for "${key}": function not found for`,
          ` project "${this.serverless.service.provider.project}" in region "${this.options.region}".`,
        ].join('');
        throw new Error(errorMessage);
      }
    });

    return BbPromise.resolve();
  },
};
