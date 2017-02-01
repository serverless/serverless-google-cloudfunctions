'use strict';

const expect = require('chai').expect;
const GoogleIndex = require('./index');
const GoogleDeploy = require('./deploy/googleDeploy');
const GoogleInfo = require('./info/googleInfo');
const GoogleInvoke = require('./invoke/googleInvoke');
const GoogleLogs = require('./logs/googleLogs');
const GoogleProvider = require('./provider/googleProvider');
const GoogleRemove = require('./remove/googleRemove');

class ServerlessMock {
  constructor() {
    this._plugins = [];
    this.pluginManager = {
      addPlugin: (plugin) => this._plugins.push(plugin)
    };
  }
}

describe('GoogleIndex', () => {

  let googleProvider;
  let serverless;

  beforeEach(() => {
    serverless = new ServerlessMock();
    googleProvider = new GoogleIndex(serverless);
  });

  describe('#constructor()', () => {
    it('should set the serverless instance', () => {
      expect(googleProvider.serverless).to.equal(serverless);
    });

    it('should set the correct options if a options object is passed', () => {
      const options = { some: 'property' };
      const withOptions = new GoogleIndex(serverless, options);

      expect(withOptions.options.some).to.equal('property');
    });

    it('should set add plugins to serverless pluginManager', () => {
      const addedPlugins = serverless._plugins;
      expect(addedPlugins).to.contain(GoogleDeploy);
      expect(addedPlugins).to.contain(GoogleInfo);
      expect(addedPlugins).to.contain(GoogleInvoke);
      expect(addedPlugins).to.contain(GoogleLogs);
      expect(addedPlugins).to.contain(GoogleProvider);
      expect(addedPlugins).to.contain(GoogleRemove);
    });
  });
});
