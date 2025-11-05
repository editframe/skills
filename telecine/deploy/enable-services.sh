# AUDIT: These should really be managed by pulumi, with proper service dependencies per resource. I'm almost certain this isn't a complete list anyway.
gcloud services enable \
  storage.googleapis.com \
  artifactregistry.googleapis.com \
  sqladmin.googleapis.com \
  compute.googleapis.com \
  servicenetworking.googleapis.com \
  vpcaccess.googleapis.com \
  secretmanager.googleapis.com \
  iap.googleapis.com \
  networkservices.googleapis.com \
  cloudtrace.googleapis.com \
  memorystore.googleapis.com \
  serviceconsumermanagement.googleapis.com \
  networkconnectivity.googleapis.com 
