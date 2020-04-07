# Migration Reference from v2 to v3

## Background

> Google Cloud Functions v1beta2 API version will be shut down on April 15, 2020

When you are using serverless to deploy google cloud functions with serverless google plugin v3 (Support google api v1),
It may face a error like

```
Deployment failed: TYPE_MISMATCH
     Resource types cannot be changed, previous (cloudfunctions.v1beta2.function) -> updated (gcp-types/cloudfunctions-v1:projects.locations.functions)
```

Which means the former ones deployed used serverless-google-cloudfunctions v2, thus it failed to deploy.
First please be careful that

## Solutions

If you choose to upgrade to v1 function , and make sure the _package.json_ using the latest plugin in nodejs project

```json
  "devDependencies": {
    "serverless-google-cloudfunctions": "*"
  },
```

There are two options to upgrade the exising cloud functions that deploy via _serverless-google-cloudfunctions v2_ (google api v1beta).

### Option 1

The first is from the devops point of view ,you don't need to change the code at all.

you need to open the [deployment manager](https://cloud.google.com/deployment-manager) in GCP.

- _Delete all the functions_

  You have to delete all the functions and related bucket first ,and then delete the all the related resources from deployment manager

- _Delete all the related buckets with cloud functions_

  By default, each time you you use `serverless deploy` , it would create a bucket for you to store the zip package for the function. pls delete this bucket first.

- _Delete all the function resources in deployment manager_

- _Redeploy the functions_

### Option 2

The second is from the developers' point of view , which means you need to make some changes to the `serverless.yml`.

- Change the service name or change the function name to make sure this function is different from the older one.

- Redeploy the functions.

- Once it's done，you may consider delete the old ones.

### Notices

Both the methods have some pros and cons, see the details from here:

1. If your functions are called by bucket or pubsub, the modification of the function name may not impact your business.

2. If your functions are called by http, the function name would be changed, which means the http url that need to be called may also be changed

3. If you use cloud function to store some important data, pls export these data first and then import them to a new bucket.
