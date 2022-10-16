'use strict';

const _ = require('lodash');

module.exports = {
  createIamRoles() {
    const provider = this.serverless.service.provider;
    const iamConfig = provider.iam;
    if (!iamConfig || !iamConfig.permissions) return;

    if (provider.serviceAccountEmail) {
      throw new Error('Cannot set both iam permissions and serviceAccountEmail on provider')
    }

    const projectId = provider.project;
    const serviceName = `${this.serverless.service.service}-${this.options.stage}`;
    const serviceAccountName = `sls-${serviceName}`;
    const serviceAccountEmail = `${serviceAccountName}@${projectId}.iam.gserviceaccount.com`;

    provider.serviceAccountEmail = serviceAccountEmail;

    const deploymentResources =
      this.serverless.service.provider.compiledConfigurationTemplate.resources;

    // Create Cloud Function identity service account to assign custom IAM roles to
    deploymentResources.push({
      type: 'iam.v1.serviceAccount',
      name: serviceAccountName,
      properties: {
        accountId: serviceAccountName,
        displayName: serviceAccountName,
        description: `Generated service account for Serverless project ${serviceName}`,
      },
    });

    // Collect all permissions that don't apply to a specific resource
    const [permissions, resourceSpecificRoles] = _.partition(
      iamConfig.permissions,
      (item) => typeof item === 'string'
    );

    // Create and assign custom role for permissions without a resource
    if (permissions.length > 0) {
      const iamObject = { permissions, projectId };
      const role = getCustomRoleTemplate(projectId, serviceName, iamObject);
      deploymentResources.push(role);
      deploymentResources.push(
        getIamMemberTemplate(projectId, serviceAccountEmail, role, iamObject)
      );
    }

    // Create and assign custom role(s) for each specific resource resource
    resourceSpecificRoles.forEach((iamObject) => {
      const role = getCustomRoleTemplate(projectId, serviceName, iamObject);
      deploymentResources.push(role);
      deploymentResources.push(
        getIamMemberTemplate(projectId, serviceAccountEmail, role, iamObject)
      );
    });
  },
};

const getCustomRoleTemplate = (project, serviceName, config) => {
  const namePrefix = serviceName.slice(0, 48).replaceAll('-', '_');
  const nameSuffix = getResourceRoleSuffix(config)
    .replace(/[^a-zA-Z_]/g, '')
    .slice(0, 64 - namePrefix.length);
  const name = `${namePrefix}_${nameSuffix}`;

  return {
    type: 'gcp-types/iam-v1:projects.roles',
    name,
    properties: {
      parent: `projects/${project}`,
      roleId: name,
      role: {
        title: name,
        description: 'Generated IAM role for Serverless project ${serviceName}',
        stage: 'GA',
        includedPermissions: config.permissions,
      },
    },
  };
};

const getIamMemberTemplate = (project, serviceAccountEmail, role, config) => {
  const { type, resource } = getIamMembershipResourceType(config);

  return {
    type,
    name: `${role.name}_members`,
    properties: {
      ...resource,
      role: `projects/${project}/roles/${role.properties.roleId}`,
      member: `serviceAccount:${serviceAccountEmail}`,
    },
  };
};

const getResourceRoleSuffix = (config) => {
  if (config.bucket) return `gcs_${config.bucket}`;
  if (config.organizationId) return `org_${config.organizationId}`;
  if (config.folderId) return `fol_${config.folderId}`;
  if (config.projectId) return `pro_${config.projectId}`;
  if (config.cloudFunction) return `gcf_${config.cloudFunction}`;
  return '';
};

const getIamMembershipResourceType = (config) => {
  if (config.bucket) {
    return {
      type: 'gcp-types/storage-v1:virtual.buckets.iamMemberBinding',
      resource: {
        bucket: config.bucket,
      },
    };
  }
  if (config.organizationId) {
    return {
      type: 'gcp-types/cloudresourcemanager-v1:virtual.organizations.iamMemberBinding',
      resource: {
        resource: config.organizationId,
      },
    };
  }
  if (config.folderId) {
    return {
      type: 'gcp-types/cloudresourcemanager-v2:virtual.folders.iamMemberBinding',
      resource: {
        resource: config.folderId,
      },
    };
  }
  if (config.projectId) {
    return {
      type: 'gcp-types/cloudresourcemanager-v1:virtual.projects.iamMemberBinding',
      resource: {
        resource: config.projectId,
      },
    };
  }
  if (config.cloudFunction) {
    return {
      type: 'gcp-types/cloudfunctions-v1:virtual.projects.locations.functions.iamMemberBinding',
      resource: {
        resource: config.cloudFunction,
      },
    };
  }

  throw new Error('IAM resource type not supported');
};
