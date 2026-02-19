import workerResourcesModule from "../deploy/worker-resources.config";

const { workerResources, toDockerCompose } = workerResourcesModule;

for (const [workerName, resources] of Object.entries(workerResources)) {
  const envPrefix = workerName
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2")
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .toUpperCase();

  const dockerResources = toDockerCompose(resources);

  console.log(`export WORKER_${envPrefix}_CPUS="${dockerResources.cpus}"`);
  console.log(`export WORKER_${envPrefix}_MEMORY="${dockerResources.memory}"`);
}
