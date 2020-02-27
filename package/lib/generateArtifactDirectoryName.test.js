'use strict';

const GoogleProvider = require('../../provider/googleProvider');
const GooglePackage = require('../googlePackage');
const Serverless = require('../../test/serverless');

describe('GenerateArtifactDirectoryName', () => {
  let serverless;
  let googlePackage;

  beforeEach(() => {
    serverless = new Serverless();
    serverless.service.service = 'my-service';
    serverless.service.package = {
      artifactDirectoryName: null,
    };
    serverless.setProvider('google', new GoogleProvider(serverless));
    const options = {
      stage: 'dev',
      region: 'us-central1',
    };
    googlePackage = new GooglePackage(serverless, options);
  });

  it('should create a valid artifact directory name', () => {
    const expectedRegex = new RegExp('serverless/my-service/dev/.*');

    return googlePackage.generateArtifactDirectoryName().then(() => {
      expect(serverless.service.package.artifactDirectoryName).toMatch(expectedRegex);
    });
  });
});
