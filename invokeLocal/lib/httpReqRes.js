'use strict';

const express = require('express');
const http = require('http');
const net = require('net');

// The getReqRes method create an express request and an express response
// as they are created in an express server before being passed to the middlewares
// Google use express 4.17.1 to run http cloud function
// https://cloud.google.com/functions/docs/writing/http#http_frameworks
const app = express();

module.exports = {
  getReqRes() {
    const req = new http.IncomingMessage(new net.Socket());
    const expressRequest = Object.assign(req, { app });
    Object.setPrototypeOf(expressRequest, express.request);

    const res = new http.ServerResponse(req);
    const expressResponse = Object.assign(res, { app, req: expressRequest });
    Object.setPrototypeOf(expressResponse, express.response);

    expressRequest.res = expressResponse;

    return {
      expressRequest,
      expressResponse,
    };
  },
};
