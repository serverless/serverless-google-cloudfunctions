'use strict';

/* eslint no-use-before-define: 0 */

const _ = require('lodash');
const BbPromise = require('bluebird');

module.exports = {
  mergeServiceResources() {
    const resources = this.serverless.service.resources;

    if ((typeof resources === 'undefined') || _.isEmpty(resources)) return BbPromise.resolve();

    _.mergeWith(
      this.serverless.service.provider.compiledConfigurationTemplate,
      resources,
      mergeCustomizer);

    return BbPromise.resolve();
  },
};

const mergeCustomizer = (objValue, srcValue) => {
  if (_.isArray(objValue)) return objValue.concat(srcValue);
  return objValue;
};
