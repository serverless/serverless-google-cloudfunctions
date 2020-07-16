'use strict';

/* eslint no-use-before-define: 0 */

const path = require('path');

const _ = require('lodash');
const BbPromise = require('bluebird');

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

      this.serverless.cli.log(`Compiling function "${functionName}"...`);

      validateHandlerProperty(funcObject, functionName);
      validateEventsProperty(funcObject, functionName);
      validateVpcConnectorProperty(funcObject, functionName);
      validateIamProperty(funcObject, functionName);

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
      funcTemplate.properties.runtime =
        _.get(funcObject, 'runtime') ||
        _.get(this, 'serverless.service.provider.runtime') ||
        'nodejs8';
      funcTemplate.properties.timeout =
        _.get(funcObject, 'timeout') || _.get(this, 'serverless.service.provider.timeout') || '60s';
      funcTemplate.properties.environmentVariables = _.merge(
        {},
        _.get(this, 'serverless.service.provider.environment'),
        funcObject.environment // eslint-disable-line comma-dangle
      );
      funcTemplate.accessControl.gcpIamPolicy.bindings = _.unionBy(
        _.get(funcObject, 'iam.bindings'),
        _.get(this, 'serverless.service.provider.iam.bindings'),
        'role'
      );

      if (!funcTemplate.properties.serviceAccountEmail) {
        delete funcTemplate.properties.serviceAccountEmail;
      }

      if (funcObject.vpc) {
        _.assign(funcTemplate.properties, {
          vpcConnector: _.get(funcObject, 'vpc') || _.get(this, 'serverless.service.provider.vpc'),
        });
      }

      if (funcObject.maxInstances) {
        funcTemplate.properties.maxInstances = funcObject.maxInstances;
      }

      if (_.get(funcObject, 'vpcConnector') || _.get(this, 'serverless.service.provider.vpcConnector')) {
        funcTemplate.properties.vpcConnector = _.get(funcObject, 'vpcConnector')
          || _.get(this, 'serverless.service.provider.vpcConnector');
      }

      if (!_.size(funcTemplate.properties.environmentVariables)) {
        delete funcTemplate.properties.environmentVariables;
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

        if (funcObject.allowUnauthenticated) {
          funcTemplate.accessControl.gcpIamPolicy.bindings = _.unionBy(
            [{ role: 'roles/cloudfunctions.invoker', members: ['allUsers'] }],
            funcTemplate.accessControl.gcpIamPolicy.bindings,
            'role'
          );
        }
      }
      if (eventType === 'event') {
        const type = funcObject.events[0].event.eventType;
        const path = funcObject.events[0].event.path; //eslint-disable-line
        const resource = funcObject.events[0].event.resource;

        funcTemplate.properties.eventTrigger = {};
        funcTemplate.properties.eventTrigger.eventType = type;
        if (path) funcTemplate.properties.eventTrigger.path = path;
        funcTemplate.properties.eventTrigger.resource = resource;
      }

      if (!funcTemplate.accessControl.gcpIamPolicy.bindings.length) {
        delete funcTemplate.accessControl;
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

const validateEventsProperty = (funcObject, functionName) => {
  if (!funcObject.events || funcObject.events.length === 0) {
    const errorMessage = [
      `Missing "events" property for function "${functionName}".`,
      ' Your function needs at least one "event".',
      ' Please check the docs for more info.',
    ].join('');
    throw new Error(errorMessage);
  }

  if (funcObject.events.length > 1) {
    const errorMessage = [
      `The function "${functionName}" has more than one event.`,
      ' Only one event per function is supported.',
      ' Please check the docs for more info.',
    ].join('');
    throw new Error(errorMessage);
  }

  const supportedEvents = ['http', 'event'];
  const eventType = Object.keys(funcObject.events[0])[0];
  if (supportedEvents.indexOf(eventType) === -1) {
    const errorMessage = [
      `Event type "${eventType}" of function "${functionName}" not supported.`,
      ` supported event types are: ${supportedEvents.join(', ')}`,
    ].join('');
    throw new Error(errorMessage);
  }
};

const validateVpcConnectorProperty = (funcObject, functionName) => {
  if (funcObject.vpc && typeof funcObject.vpc === 'string') {
    const vpcNamePattern = /projects\/[\s\S]*\/locations\/[\s\S]*\/connectors\/[\s\S]*/i;
    if (!vpcNamePattern.test(funcObject.vpc)) {
      const errorMessage = [
        `The function "${functionName}" has invalid vpc connection name`,
        ' VPC Connector name should follow projects/{project_id}/locations/{region}/connectors/{connector_name}',
        ' Please check the docs for more info.',
      ].join('');
      throw new Error(errorMessage);
    }
  }
};

const validateIamProperty = (funcObject, functionName) => {
  if (_.get(funcObject, 'iam.bindings') && funcObject.iam.bindings.length > 0) {
    funcObject.iam.bindings.forEach((binding) => {
      if (!binding.role) {
        const errorMessage = [
          `The function "${functionName}" has no role specified for an IAM binding.`,
          ' Each binding requires a role. For details on supported roles, see the documentation',
          ' at: https://cloud.google.com/iam/docs/understanding-roles',
        ].join('');
        throw new Error(errorMessage);
      }
      if (!Array.isArray(binding.members) || !binding.members.length) {
        const errorMessage = [
          `The function "${functionName}" has no members specified for an IAM binding.`,
          ' Each binding requires at least one member to be assigned. See the IAM documentation',
          ' for details on configuring members: https://cloud.google.com/iam/docs/overview',
        ].join('');
        throw new Error(errorMessage);
      }
    });
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
      runtime: 'nodejs8',
      timeout: '60s',
      entryPoint: funcObject.handler,
      function: funcObject.name,
      sourceArchiveUrl,
    },
    accessControl: {
      gcpIamPolicy: {
        bindings: [],
      },
    },
  };
};
