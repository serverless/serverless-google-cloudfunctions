'use strict';

const sinon = require('sinon');
const BbPromise = require('bluebird');

const GoogleProvider = require('../provider/googleProvider');
const GoogleDeploy = require('./googleDeploy');
const Serverless = require('../test/serverless');

describe('GoogleDeploy', () => {
  let serverless;
  let options;
  let googleDeploy;

  beforeEach(() => {
    serverless = new Serverless();
    options = {
      stage: 'my-stage',
      region: 'my-region',
    };
    serverless.setProvider('google', new GoogleProvider(serverless));
    googleDeploy = new GoogleDeploy(serverless, options);
  });

  describe('#constructor()', () => {
    it('should set the serverless instance', () => {
      expect(googleDeploy.serverless).toEqual(serverless);
    });

    it('should set options if provided', () => {
      expect(googleDeploy.options).toEqual(options);
    });

    it('should make the provider accessible', () => {
      expect(googleDeploy.provider).toBeInstanceOf(GoogleProvider);
    });

    describe('hooks', () => {
      let validateStub;
      let setDefaultsStub;
      let prepareDeploymentStub;
      let createDeploymentStub;
      let generateArtifactDirectoryNameStub;
      let compileFunctionsStub;
      let mergeServiceResourcesStub;
      let uploadArtifactsStub;
      let updateDeploymentStub;
      let cleanupDeploymentBucketStub;

      beforeEach(() => {
        validateStub = sinon.stub(googleDeploy, 'validate')
          .returns(BbPromise.resolve());
        setDefaultsStub = sinon.stub(googleDeploy, 'setDefaults')
          .returns(BbPromise.resolve());
        prepareDeploymentStub = sinon.stub(googleDeploy, 'prepareDeployment')
          .returns(BbPromise.resolve());
        createDeploymentStub = sinon.stub(googleDeploy, 'createDeployment')
          .returns(BbPromise.resolve());
        generateArtifactDirectoryNameStub = sinon
          .stub(googleDeploy, 'generateArtifactDirectoryName')
          .returns(BbPromise.resolve());
        compileFunctionsStub = sinon.stub(googleDeploy, 'compileFunctions')
          .returns(BbPromise.resolve());
        mergeServiceResourcesStub = sinon.stub(googleDeploy, 'mergeServiceResources')
          .returns(BbPromise.resolve());
        uploadArtifactsStub = sinon.stub(googleDeploy, 'uploadArtifacts')
          .returns(BbPromise.resolve());
        updateDeploymentStub = sinon.stub(googleDeploy, 'updateDeployment')
          .returns(BbPromise.resolve());
        cleanupDeploymentBucketStub = sinon.stub(googleDeploy, 'cleanupDeploymentBucket')
          .returns(BbPromise.resolve());
      });

      afterEach(() => {
        googleDeploy.validate.restore();
        googleDeploy.setDefaults.restore();
        googleDeploy.prepareDeployment.restore();
        googleDeploy.createDeployment.restore();
        googleDeploy.generateArtifactDirectoryName.restore();
        googleDeploy.compileFunctions.restore();
        googleDeploy.mergeServiceResources.restore();
        googleDeploy.uploadArtifacts.restore();
        googleDeploy.updateDeployment.restore();
        googleDeploy.cleanupDeploymentBucket.restore();
      });

      it('should run "before:deploy:initialize" promise chain', () => googleDeploy
        .hooks['before:deploy:initialize']().then(() => {
          expect(validateStub.calledOnce).toEqual(true);
          expect(setDefaultsStub.calledAfter(validateStub)).toEqual(true);
        }));

      it('should run "deploy:initialize" promise chain', () => googleDeploy
        .hooks['deploy:initialize']().then(() => {
          expect(prepareDeploymentStub.calledOnce).toEqual(true);
        }));

      it('it should run "deploy:setupProviderConfiguration" promise chain', () => googleDeploy
        .hooks['deploy:setupProviderConfiguration']().then(() => {
          expect(createDeploymentStub.calledOnce).toEqual(true);
        }),
      );

      it('should run "before:deploy:compileFunctions" promise chain', () => googleDeploy
        .hooks['before:deploy:compileFunctions']().then(() => {
          expect(generateArtifactDirectoryNameStub.calledOnce).toEqual(true);
          expect(compileFunctionsStub.calledAfter(generateArtifactDirectoryNameStub)).toEqual(true);
        }));

      it('should run "deploy:deploy" promise chain', () => googleDeploy
        .hooks['deploy:deploy']().then(() => {
          expect(mergeServiceResourcesStub.calledOnce).toEqual(true);
          expect(uploadArtifactsStub.calledAfter(mergeServiceResourcesStub)).toEqual(true);
          expect(updateDeploymentStub.calledAfter(uploadArtifactsStub)).toEqual(true);
          expect(cleanupDeploymentBucketStub.calledAfter(updateDeploymentStub)).toEqual(true);
        }));
    });
  });
});
