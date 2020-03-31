
#  Cloud function Migration Reference from v1beta to v1

## Background

> Google Cloud Functions v1beta2 API version will be shut down on April 15, 2020

When you are using serverless to deploy google cloud functions with latest serverless google plugin (support google api v1),
It may face a error like

```shell
Deployment failed: TYPE_MISMATCH
     Resource types cannot be changed, previous (cloudfunctions.v1beta2.function) -> updated (gcp-types/cloudfunctions-v1:projects.locations.functions)
```

Which means the former ones deployed used v1beta2 api version and now use v1 in the v2.4.2 of serverless-google-cloudfunctions, thus it failed to deploy.
First please be careful that



## Solutions

If you choose to upgrade to v1 function , and make sure the **package.json** using the latest plugin in nodejs project

```
  "devDependencies": {
    "serverless-google-cloudfunctions": "*"
  },
```
There are at least two options to upgrade the exisingt cloud function that deploy via google api v1beta.

### Option 1

The first is from the devops point of view ,you don't need to change the code at all.

you need to open the [deployment manager](https://cloud.google.com/deployment-manager) in GCP.

* Delete all the functions

you have to delete all the functions and related bucket first ,and then delete the  all the related resources from deployment manager

* Delete all the related buckets with cloud functions

By default, each time you you use `serverless deploy ` , it would create a bucket for you to store the zip package for the function.

pls delete this bucket first.

* Delete all the function resources in deployment manager
 
* Redeploy the functions

### Option 2 

The second is from the developers' point of view , which means you need to make some changes to the `serverless.yml`.

* Change the service name or change the function name to make sure this function is different from the older one.

* redeploy the functions.

* Once it's done，you may consider delete the old ones.

### Notices

Both the methods have some pros and cons, but it would work at least .

1. If your functions are called by bucket or pubsub, the modification of the function name may not impact your business.

2. If your functions are called by http, the function name would be changed, which means the http url that need to be called may also be changed

3. If you use cloud function to store some important data, pls export these data first and then import them to a new bucket.

