# google cloud function migration reference

## Background

When you are using serverless to deploy google cloud functions with latest serverless google plugin,
It may face a error like

```
Deployment failed: TYPE_MISMATCH

     Resource types cannot be changed, previous (cloudfunctions.v1beta2.function) -> updated (gcp-types/cloudfunctions-v1:projects.locations.functions)
```

Which means the former ones deployed used v1beta2 api version and now use v1 in the v2.4.2 of serverless-google-cloudfunctions, thus it failed to deploy.

## Solutions

First please be careful that

> Google Cloud Functions v1beta2 API version will be shut down on April 15, 2020

https://github.com/serverless/serverless-google-cloudfunctions/pull/165

### Temporary solution

if you still want to use v1beta2 before April 15, 2020

1. Choose a right version for your own project

you can specify the **package.json** in nodejs project like

```
  "devDependencies": {
    "serverless-google-cloudfunctions": "^2.4.1"
  },
```

the version of the serverless-google-cloudfunctions must be below **v2.4.2**

2. Redeploy

redeploy it ,and everything would be ok.

Then you should consider upgrading to v1.

### Final solution

If you choose to upgrade to v1 function , and make sure the **package.json** using the latest plugin in nodejs project

```
  "devDependencies": {
    "serverless-google-cloudfunctions": "*"
  },
```

there are at least two ways to realize that.

#### method 1

The first is from the operation's point of view ,you don't need to change the code at all.

you need to use the [deployment manager](https://cloud.google.com/deployment-manager) in GCP.

1. Delete all the functions

you have to delete all the functions and related bucket first ,and then delete the all the related resources from deployment manager

2. Delete all the related buckets with cloud functions

By default , each time you you use `serverless deploy` , it would create a bucket for you to store the zip package for the function.

pls delete this bucket first.

3. Delete all the function resources in deployment manager

4. Redeploy the functions

#### method 2

The second is from the developers' point of view , which means you need to make some changes to the `serverless.yml`.

For example , one of your services may be named `service-1` ,and you may change it to whatever different from this name

or rename the function's name to make sure this function is different from the older one.

And then redeploy the functions.

Once it's done ，you may consider delete the older ones.

### Notices

Both the methods have some pros and cons, but it would work at least .

1. If your functions are called by bucket or topic , the modification of the function name may not impact your business.

2. If your functions are called by http ,the function name would be changed ,which means the http url that need to be called may also be changed

3. If you use cloud function to store some important data,pls export these data first and then import them to a new bucket.
