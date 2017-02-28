'use strict';

const fs = require('fs');

const sinon = require('sinon');
const google = require('googleapis');

const GoogleProvider = require('./googleProvider');
const Serverless = require('../test/serverless');

describe('GoogleProvider', () => {
  let readFileSyncStub;
  let googleProvider;
  let serverless;
  let setProviderStub;

  beforeEach(() => {
    serverless = new Serverless();
    serverless.service = {
      provider: {
        project: 'example-project',
        credentials: '12345678-abcdefgh',
      },
    };
    setProviderStub = sinon.stub(serverless, 'setProvider').returns();
    readFileSyncStub = sinon.stub(fs, 'readFileSync')
      .returns('{"client_email": "foo@bar.de","private_key": "wasdqwerty"}');
    googleProvider = new GoogleProvider(serverless);
  });

  afterEach(() => {
    serverless.setProvider.restore();
    fs.readFileSync.restore();
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
      expect(googleProvider.sdk.deploymentmanager)
        .toBeDefined();

      expect(googleProvider.sdk.storage)
        .toBeDefined();
    });
  });

  describe('#getAuthClient()', () => {
    it('should return a new authClient', () => {
      const authClient = googleProvider.getAuthClient();

      expect(readFileSyncStub.calledOnce).toEqual(true);
      expect(authClient).toBeInstanceOf(google.auth.JWT);
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
