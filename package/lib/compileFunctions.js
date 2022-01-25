'use strict';

/* eslint no-use-before-define: 0 */

const path = require('path');

const _ = require('lodash');
const BbPromise = require('bluebird');
const { validateEventsProperty } = require('../../shared/validate');

module.exports = {
  compileFunctions() {
    const artifactFilePath = this.serverless.service.package.artifact;
    const fileName = artifactFilePath.split(path.sep).pop();
    const projectName = _.get(this, 'serverless.service.provider.project');
    this.serverless.service.provider.region =
      this.serverless.service.provider.region || 'us-central1';
    this.serverless.service.package.artifactFilePath = `${this.serverless.service.package.artifactDirectoryName}/${fileName}`;

    this.serverless.service.getAllFunctions().forEach((functionName) => {
      const funcObject = this.serverless.service.getFunction(functionName);

      let vpcEgress = funcObject.vpcEgress || this.serverless.service.provider.vpcEgress;

      this.serverless.cli.log(`Compiling function "${functionName}"...`);

      validateHandlerProperty(funcObject, functionName);
      validateEventsProperty(funcObject, functionName);
      validateVpcConnectorProperty(funcObject, functionName);
      validateVpcConnectorEgressProperty(vpcEgress);

      const funcTemplate = getFunctionTemplate(
        funcObject,
        projectName,
        this.serverless.service.provider.region,
        `gs://${this.serverless.service.provider.deploymentBucketName}/${this.serverless.service.package.artifactFilePath}`
      );

      funcTemplate.properties.serviceAccountEmail =
        _.get(funcObject, 'serviceAccountEmail') ||
        _.get(this, 'serverless.service.provider.serviceAccountEmail') ||
        null;
      funcTemplate.properties.availableMemoryMb =
        _.get(funcObject, 'memorySize') ||
        _.get(this, 'serverless.service.provider.memorySize') ||
        256;
      funcTemplate.properties.runtime = this.provider.getRuntime(funcObject);
      funcTemplate.properties.timeout =
        _.get(funcObject, 'timeout') || _.get(this, 'serverless.service.provider.timeout') || '60s';
      funcTemplate.properties.environmentVariables =
        this.provider.getConfiguredEnvironment(funcObject);
      funcTemplate.properties.buildEnvironmentVariables =
        this.provider.getConfiguredBuildEnvironment(funcObject);

      if (!funcTemplate.properties.serviceAccountEmail) {
        delete funcTemplate.properties.serviceAccountEmail;
      }

      if (funcObject.vpc) {
        _.assign(funcTemplate.properties, {
          vpcConnector: _.get(funcObject, 'vpc') || _.get(this, 'serverless.service.provider.vpc'),
        });
      }

      if (vpcEgress) {
        vpcEgress = vpcEgress.toUpperCase();
        if (vpcEgress === 'ALL') vpcEgress = 'ALL_TRAFFIC';
        if (vpcEgress === 'PRIVATE') vpcEgress = 'PRIVATE_RANGES_ONLY';
        _.assign(funcTemplate.properties, {
          vpcConnectorEgressSettings: vpcEgress,
        });
      }

      if (funcObject.maxInstances) {
        funcTemplate.properties.maxInstances = funcObject.maxInstances;
      }

      if (funcObject.minInstances) {
        funcTemplate.properties.minInstances = funcObject.minInstances;
      }

      if (!_.size(funcTemplate.properties.environmentVariables)) {
        delete funcTemplate.properties.environmentVariables;
      }
      if (!_.size(funcTemplate.properties.buildEnvironmentVariables)) {
        delete funcTemplate.properties.buildEnvironmentVariables;
      }

      funcTemplate.properties.labels = _.assign(
        {},
        _.get(this, 'serverless.service.provider.labels') || {},
        _.get(funcObject, 'labels') || {} // eslint-disable-line comma-dangle
      );

      const eventType = Object.keys(funcObject.events[0])[0];

      if (eventType === 'http') {
        const url = funcObject.events[0].http;

        funcTemplate.properties.httpsTrigger = {};
        funcTemplate.properties.httpsTrigger.url = url;
      }
      if (eventType === 'event') {
        const type = funcObject.events[0].event.eventType;
        const path = funcObject.events[0].event.path; //eslint-disable-line
        const resource = funcObject.events[0].event.resource;
        const failurePolicy = funcObject.events[0].event.failurePolicy;
        const retry = _.get(funcObject.events[0].event, 'failurePolicy.retry');

        funcTemplate.properties.eventTrigger = {};
        funcTemplate.properties.eventTrigger.eventType = type;
        if (path) funcTemplate.properties.eventTrigger.path = path;
        funcTemplate.properties.eventTrigger.resource = resource;
        if (failurePolicy) {
          funcTemplate.properties.eventTrigger.failurePolicy = {};
          funcTemplate.properties.eventTrigger.failurePolicy.retry = retry;
        }
      }

      this.serverless.service.provider.compiledConfigurationTemplate.resources.push(funcTemplate);
    });

    return BbPromise.resolve();
  },
};

const validateHandlerProperty = (funcObject, functionName) => {
  if (!funcObject.handler) {
    const errorMessage = [
      `Missing "handler" property for function "${functionName}".`,
      ' Your function needs a "handler".',
      ' Please check the docs for more info.',
    ].join('');
    throw new Error(errorMessage);
  }
};

const validateVpcConnectorProperty = (funcObject, functionName) => {
  if (funcObject.vpc && typeof funcObject.vpc === 'string') {
    // vpcConnector argument can be one of two possible formats as described here:
    // https://cloud.google.com/functions/docs/reference/rest/v1/projects.locations.functions#resource:-cloudfunction
    if (funcObject.vpc.indexOf('/') > -1) {
      const vpcNamePattern = /projects\/[\s\S]*\/locations\/[\s\S]*\/connectors\/[\s\S]*/i;
      if (!vpcNamePattern.test(funcObject.vpc)) {
        const errorMessage = [
          `The function "${functionName}" has invalid vpc connection name`,
          ' VPC Connector name should follow projects/{project_id}/locations/{region}/connectors/{connector_name}',
          ' or just {connector_name} if within the same project.',
          ' Please check the docs for more info at ',
          ' https://cloud.google.com/functions/docs/reference/rest/v1/projects.locations.functions#resource:-cloudfunction',
        ].join('');
        throw new Error(errorMessage);
      }
    }
  }
};

const validateVpcConnectorEgressProperty = (vpcEgress) => {
  if (vpcEgress && typeof vpcEgress !== 'string') {
    const errorMessage = [
      'Your provider/function has invalid vpc connection name',
      ' VPC Connector Egress Setting be either ALL_TRAFFIC or PRIVATE_RANGES_ONLY. ',
      ' You may shorten these to ALL or PRIVATE optionally.',
      ' Please check the docs for more info at',
      ' https://cloud.google.com/functions/docs/reference/rest/v1/projects.locations.functions#resource:-cloudfunction',
    ].join('');
    throw new Error(errorMessage);
  }
};

const getFunctionTemplate = (funcObject, projectName, region, sourceArchiveUrl) => {
  //eslint-disable-line
  return {
    type: 'gcp-types/cloudfunctions-v1:projects.locations.functions',
    name: funcObject.name,
    properties: {
      parent: `projects/${projectName}/locations/${region}`,
      availableMemoryMb: 256,
      runtime: 'nodejs10',
      timeout: '60s',
      entryPoint: funcObject.handler,
      function: funcObject.name,
      sourceArchiveUrl,
    },
  };
};
