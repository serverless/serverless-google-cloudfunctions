'use strict';

/*
NOTE: this plugin is used to add all the differnet provider related plugins at once.
This way only one plugin needs to be added to the service in order to get access to the
whole provider implementation.
*/

const GoogleProvider = require('./provider/googleProvider');
const GooglePackage = require('./package/googlePackage');
const GoogleDeploy = require('./deploy/googleDeploy');
const GoogleRemove = require('./remove/googleRemove');
const GoogleInvoke = require('./invoke/googleInvoke');
const GoogleInvokeLocal = require('./invokeLocal/googleInvokeLocal');
const GoogleLogs = require('./logs/googleLogs');
const GoogleInfo = require('./info/googleInfo');

class GoogleIndex {
  constructor(serverless, options, v3Utils) {
    this.serverless = serverless;
    this.options = options;

    if (v3Utils) {
      this.log = v3Utils.log;
      this.progress = v3Utils.progress;
      this.writeText = v3Utils.writeText;
    }

    this.serverless.pluginManager.addPlugin(GoogleProvider);
    this.serverless.pluginManager.addPlugin(GooglePackage);
    this.serverless.pluginManager.addPlugin(GoogleDeploy);
    this.serverless.pluginManager.addPlugin(GoogleRemove);
    this.serverless.pluginManager.addPlugin(GoogleInvoke);
    this.serverless.pluginManager.addPlugin(GoogleInvokeLocal);
    this.serverless.pluginManager.addPlugin(GoogleLogs);
    this.serverless.pluginManager.addPlugin(GoogleInfo);
  }
}

module.exports = GoogleIndex;
