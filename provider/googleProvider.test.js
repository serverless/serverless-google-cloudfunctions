'use strict';

const os = require('os');

const sinon = require('sinon');
const google = require('googleapis').google;

const GoogleProvider = require('./googleProvider');
const Serverless = require('../test/serverless');

describe('GoogleProvider', () => {
  let googleProvider;
  let serverless;
  let setProviderStub;
  let homedirStub;

  beforeEach(() => {
    serverless = new Serverless();
    serverless.version = '1.0.0';
    serverless.service = {
      provider: {
        project: 'example-project',
      },
    };
    setProviderStub = sinon.stub(serverless, 'setProvider').returns();
    homedirStub = sinon.stub(os, 'homedir').returns('/root');
    googleProvider = new GoogleProvider(serverless);
  });

  afterEach(() => {
    serverless.setProvider.restore();
    os.homedir.restore();
  });

  describe('#getProviderName()', () => {
    it('should return the provider name', () => {
      expect(GoogleProvider.getProviderName()).toEqual('google');
    });
  });

  describe('#constructor()', () => {
    it('should store an instance of serverless', () => {
      expect(googleProvider.serverless).toBeInstanceOf(Serverless);
    });

    it('should store an instance of itself', () => {
      expect(googleProvider.provider).toBeInstanceOf(GoogleProvider);
    });

    it('should set the provider with the Serverless instance', () => {
      expect(setProviderStub.calledOnce).toEqual(true);
    });

    it('should set the used SDKs', () => {
      expect(googleProvider.sdk.google).toBeDefined();

      expect(googleProvider.sdk.deploymentmanager).toBeDefined();

      expect(googleProvider.sdk.storage).toBeDefined();

      expect(googleProvider.sdk.logging).toBeDefined();

      expect(googleProvider.sdk.cloudfunctions).toBeDefined();
    });

    it('should set the google options', () => {
      expect(google._options.headers['User-Agent']) // eslint-disable-line no-underscore-dangle
        .toMatch(/Serverless\/.+ Serverless-Google-Provider\/.+ Googleapis\/.+/);
    });
  });

  describe('#request()', () => {
    // NOTE: we're using our own custom services here to make
    // the tests SDK independent
    let savedSdk;

    beforeEach(() => {
      savedSdk = googleProvider.sdk;
      googleProvider.sdk = {
        service: {
          resource: {
            method: {
              // will be replaced for each individual test
              bind: null,
            },
          },
        },
      };
      sinon.stub(googleProvider, 'getAuthClient').returns({
        getClient: sinon.stub().resolves(),
      });
      sinon.stub(googleProvider, 'isServiceSupported').returns();
    });

    afterEach(() => {
      googleProvider.sdk = savedSdk;
      googleProvider.getAuthClient.restore();
      googleProvider.isServiceSupported.restore();
    });

    it('should perform the given request', () => {
      googleProvider.sdk.service.resource.method.bind = () =>
        sinon.stub().resolves({ data: 'result' });

      return googleProvider.request('service', 'resource', 'method', {}).then((result) => {
        expect(result).toEqual('result');
      });
    });

    it('should throw a custom error message when the project configuration is wrong', () => {
      googleProvider.sdk.service.resource.method.bind = () =>
        sinon.stub().rejects({ errors: [{ message: 'project 1043443644444' }] });

      return expect(googleProvider.request('service', 'resource', 'method', {})).rejects.toThrow(
        /Incorrect configuration/
      );
    });

    it('should re-throw other errors', () => {
      googleProvider.sdk.service.resource.method.bind = () =>
        sinon.stub().rejects(new Error('some error message'));

      return expect(googleProvider.request('service', 'resource', 'method', {})).rejects.toThrow(
        'some error message'
      );
    });
  });

  describe('#getAuthClient()', () => {
    it('should return a new authClient when using default credentials', () => {
      const authClient = googleProvider.getAuthClient();

      expect(authClient.keyFilename).toEqual(undefined);
      expect(authClient).toBeInstanceOf(google.auth.GoogleAuth);
    });

    it('should return a new authClient when using a credentials file', () => {
      googleProvider.serverless.service.provider.credentials = '/root/.gcloud/project-1234.json';

      const authClient = googleProvider.getAuthClient();

      expect(authClient.keyFilename).toEqual('/root/.gcloud/project-1234.json');
      expect(authClient).toBeInstanceOf(google.auth.GoogleAuth);
    });

    it('should expand tilde characters in credentials file paths', () => {
      googleProvider.serverless.service.provider.credentials = '~/.gcloud/project-1234.json';

      const authClient = googleProvider.getAuthClient();

      expect(homedirStub.calledOnce).toEqual(true);
      expect(authClient.keyFilename).toEqual('/root/.gcloud/project-1234.json');
      expect(authClient).toBeInstanceOf(google.auth.GoogleAuth);
    });
  });

  describe('#isServiceSupported()', () => {
    it('should do nothing if service is available', () => {
      expect(() => {
        googleProvider.isServiceSupported('storage');
      }).not.toThrow(Error);
    });

    it('should throw error if service is not Supported', () => {
      expect(() => {
        googleProvider.isServiceSupported('unsupported');
      }).toThrow(Error);
    });
  });
});
