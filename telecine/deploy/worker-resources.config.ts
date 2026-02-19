export interface WorkerResources {
  cpu: string;
  memory: string;
}

export const workerResources = {
  ingestImage: {
    cpu: "1000m",
    memory: "1Gi",
  },
  htmlFinalizer: {
    cpu: "1000m",
    memory: "1Gi",
  },
  htmlInitializer: {
    cpu: "1000m",
    memory: "1Gi",
  },
  processISOBMFF: {
    cpu: "2000m",
    memory: "4Gi",
  },
  renderInitializer: {
    cpu: "2000m",
    memory: "4Gi",
  },
  renderFragment: {
    cpu: "2000m",
    memory: "4Gi",
  },
  renderFinalizer: {
    cpu: "1000m",
    memory: "2Gi",
  },
  maintenance: {
    cpu: "500m",
    memory: "512Mi",
  },
} as const satisfies Record<string, WorkerResources>;

export function toDockerCompose(resources: WorkerResources): {
  cpus: string;
  memory: string;
} {
  const cpuMatch = resources.cpu.match(/^(\d+)m$/);
  if (!cpuMatch) {
    throw new Error(`Invalid CPU format: ${resources.cpu}`);
  }
  const cpuValue = cpuMatch[1];
  if (cpuValue === undefined) {
    throw new Error(`Invalid CPU format: ${resources.cpu}`);
  }
  const cpuCores = (parseInt(cpuValue) / 1000).toString();

  const memoryGiMatch = resources.memory.match(/^(\d+)Gi$/);
  const memoryMiMatch = resources.memory.match(/^(\d+)Mi$/);

  let memoryValue;
  if (memoryGiMatch) {
    memoryValue = `${memoryGiMatch[1]}G`;
  } else if (memoryMiMatch) {
    memoryValue = `${memoryMiMatch[1]}M`;
  } else {
    throw new Error(`Invalid memory format: ${resources.memory}`);
  }

  return {
    cpus: cpuCores,
    memory: memoryValue,
  };
}

export function toGoMemLimit(resources: WorkerResources): string {
  const memoryGiMatch = resources.memory.match(/^(\d+)Gi$/);
  const memoryMiMatch = resources.memory.match(/^(\d+)Mi$/);

  if (memoryGiMatch) {
    const giValue = parseInt(memoryGiMatch[1]);
    const mibValue = giValue * 1024;
    const softLimitMiB = Math.floor(mibValue * 0.9);
    return `${softLimitMiB}MiB`;
  }

  if (memoryMiMatch) {
    const miValue = parseInt(memoryMiMatch[1]);
    const softLimitMiB = Math.floor(miValue * 0.9);
    return `${softLimitMiB}MiB`;
  }

  throw new Error(`Invalid memory format: ${resources.memory}`);
}
