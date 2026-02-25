#!/bin/bash
# Diagnostic patches for gpu_compositing investigation
# Apply AFTER the headless-dmabuf patches
set -e

SRCDIR=/mnt/build/electron/src

# ============================================================
# 1. gpu_data_manager_impl_private.cc — trace compositing decisions
# ============================================================
FILE="$SRCDIR/content/browser/gpu/gpu_data_manager_impl_private.cc"

# Patch IsGpuCompositingDisabled
python3 -c "
import re
with open('$FILE', 'r') as f:
    content = f.read()

old = '''bool GpuDataManagerImplPrivate::IsGpuCompositingDisabled() const {
  return disable_gpu_compositing_ || !HardwareAccelerationEnabled();
}'''

new = '''bool GpuDataManagerImplPrivate::IsGpuCompositingDisabled() const {
  bool result = disable_gpu_compositing_ || !HardwareAccelerationEnabled();
  static int call_count = 0;
  if (++call_count <= 20) {
    LOG(ERROR) << \"DIAG IsGpuCompositingDisabled[\" << call_count << \"]: \"
               << \"disable_gpu_compositing_=\" << disable_gpu_compositing_
               << \" HwAccelEnabled=\" << HardwareAccelerationEnabled()
               << \" gpu_mode_=\" << static_cast<int>(gpu_mode_)
               << \" feat_init=\" << gpu_feature_info_.IsInitialized()
               << \" result=\" << result;
  }
  return result;
}'''

if old not in content:
    print('WARNING: IsGpuCompositingDisabled pattern not found')
else:
    content = content.replace(old, new)
    with open('$FILE', 'w') as f:
        f.write(content)
    print('OK: Patched IsGpuCompositingDisabled')
"

# Patch SetGpuCompositingDisabled
python3 -c "
with open('$FILE', 'r') as f:
    content = f.read()

old = '''void GpuDataManagerImplPrivate::SetGpuCompositingDisabled() {
  if (!IsGpuCompositingDisabled()) {
    disable_gpu_compositing_ = true;'''

new = '''void GpuDataManagerImplPrivate::SetGpuCompositingDisabled() {
  LOG(ERROR) << \"DIAG SetGpuCompositingDisabled CALLED! was=\" << disable_gpu_compositing_
             << \" gpu_mode_=\" << static_cast<int>(gpu_mode_);
  if (!IsGpuCompositingDisabled()) {
    disable_gpu_compositing_ = true;'''

if old not in content:
    print('WARNING: SetGpuCompositingDisabled pattern not found')
else:
    content = content.replace(old, new)
    with open('$FILE', 'w') as f:
        f.write(content)
    print('OK: Patched SetGpuCompositingDisabled')
"

# Patch UpdateGpuFeatureInfo — log incoming feature values
python3 -c "
with open('$FILE', 'r') as f:
    content = f.read()

old = '''void GpuDataManagerImplPrivate::UpdateGpuFeatureInfo(
    const gpu::GpuFeatureInfo& gpu_feature_info,
    const std::optional<gpu::GpuFeatureInfo>&
        gpu_feature_info_for_hardware_gpu) {
  if (gpu_mode_ == gpu::GpuMode::DISPLAY_COMPOSITOR) {'''

new = '''void GpuDataManagerImplPrivate::UpdateGpuFeatureInfo(
    const gpu::GpuFeatureInfo& gpu_feature_info,
    const std::optional<gpu::GpuFeatureInfo>&
        gpu_feature_info_for_hardware_gpu) {
  LOG(ERROR) << \"DIAG UpdateGpuFeatureInfo: gpu_mode_=\" << static_cast<int>(gpu_mode_)
             << \" incoming_ACCEL_GL=\" << gpu_feature_info.status_values[gpu::GPU_FEATURE_TYPE_ACCELERATED_GL]
             << \" incoming_VULKAN=\" << gpu_feature_info.status_values[gpu::GPU_FEATURE_TYPE_VULKAN]
             << \" incoming_init=\" << gpu_feature_info.IsInitialized();
  if (gpu_mode_ == gpu::GpuMode::DISPLAY_COMPOSITOR) {'''

if old not in content:
    print('WARNING: UpdateGpuFeatureInfo pattern not found')
else:
    content = content.replace(old, new)
    with open('$FILE', 'w') as f:
        f.write(content)
    print('OK: Patched UpdateGpuFeatureInfo')
"

# Patch FallBackToNextGpuMode
python3 -c "
with open('$FILE', 'r') as f:
    content = f.read()

old = '''void GpuDataManagerImplPrivate::FallBackToNextGpuMode() {
  if (fallback_modes_.empty()) {'''

new = '''void GpuDataManagerImplPrivate::FallBackToNextGpuMode() {
  LOG(ERROR) << \"DIAG FallBackToNextGpuMode: current_mode=\" << static_cast<int>(gpu_mode_)
             << \" fallback_count=\" << fallback_modes_.size()
             << \" next=\" << (fallback_modes_.empty() ? -1 : static_cast<int>(fallback_modes_.back()));
  if (fallback_modes_.empty()) {'''

if old not in content:
    print('WARNING: FallBackToNextGpuMode pattern not found')
else:
    content = content.replace(old, new)
    with open('$FILE', 'w') as f:
        f.write(content)
    print('OK: Patched FallBackToNextGpuMode')
"

echo "--- gpu_data_manager_impl_private.cc done ---"

# ============================================================
# 2. viz_process_transport_factory.cc — trace compositor setup
# ============================================================
FILE="$SRCDIR/content/browser/compositor/viz_process_transport_factory.cc"

# Patch TryCreateContextsForGpuCompositing
python3 -c "
with open('$FILE', 'r') as f:
    content = f.read()

old = '''VizProcessTransportFactory::TryCreateContextsForGpuCompositing(
    scoped_refptr<gpu::GpuChannelHost> gpu_channel_host) {
  DCHECK(!is_gpu_compositing_disabled_);'''

new = '''VizProcessTransportFactory::TryCreateContextsForGpuCompositing(
    scoped_refptr<gpu::GpuChannelHost> gpu_channel_host) {
  DCHECK(!is_gpu_compositing_disabled_);
  LOG(ERROR) << \"DIAG TryCreateContextsForGpuCompositing: has_channel=\" << !!gpu_channel_host;'''

if old not in content:
    print('WARNING: TryCreateContextsForGpuCompositing pattern not found')
else:
    content = content.replace(old, new)
    with open('$FILE', 'w') as f:
        f.write(content)
    print('OK: Patched TryCreateContextsForGpuCompositing')
"

# Patch the gpu_compositing_status check
python3 -c "
with open('$FILE', 'r') as f:
    content = f.read()

old = '''  auto gpu_compositing_status =
      gpu_feature_info.status_values[gpu::GPU_FEATURE_TYPE_ACCELERATED_GL];
  if (gpu_compositing_status != gpu::kGpuFeatureStatusEnabled)
    return gpu::ContextResult::kFatalFailure;'''

new = '''  auto gpu_compositing_status =
      gpu_feature_info.status_values[gpu::GPU_FEATURE_TYPE_ACCELERATED_GL];
  LOG(ERROR) << \"DIAG TryCreateContexts: ACCEL_GL=\" << gpu_compositing_status
             << \" (need=\" << gpu::kGpuFeatureStatusEnabled << \")\";
  if (gpu_compositing_status != gpu::kGpuFeatureStatusEnabled) {
    LOG(ERROR) << \"DIAG TryCreateContexts: FATAL - GPU compositing blocklisted\";
    return gpu::ContextResult::kFatalFailure;
  }'''

if old not in content:
    print('WARNING: gpu_compositing_status check pattern not found')
else:
    content = content.replace(old, new)
    with open('$FILE', 'w') as f:
        f.write(content)
    print('OK: Patched gpu_compositing_status check')
"

# Patch DisableGpuCompositing to log
python3 -c "
with open('$FILE', 'r') as f:
    content = f.read()

old = '''void VizProcessTransportFactory::DisableGpuCompositing(
    ui::Compositor* guilty_compositor) {
#if BUILDFLAG(IS_CHROMEOS)'''

new = '''void VizProcessTransportFactory::DisableGpuCompositing(
    ui::Compositor* guilty_compositor) {
  LOG(ERROR) << \"DIAG DisableGpuCompositing called! guilty=\" << !!guilty_compositor;
#if BUILDFLAG(IS_CHROMEOS)'''

if old not in content:
    print('WARNING: DisableGpuCompositing pattern not found')
else:
    content = content.replace(old, new)
    with open('$FILE', 'w') as f:
        f.write(content)
    print('OK: Patched DisableGpuCompositing')
"

# Patch OnEstablishedGpuChannel to log
python3 -c "
with open('$FILE', 'r') as f:
    content = f.read()

# Find the function that calls TryCreateContextsForGpuCompositing
old = '''  bool gpu_compositing =
      !is_gpu_compositing_disabled_ && !compositor->force_software_compositor();

  if (gpu_compositing) {
    auto context_result = TryCreateContextsForGpuCompositing(gpu_channel_host);'''

new = '''  bool gpu_compositing =
      !is_gpu_compositing_disabled_ && !compositor->force_software_compositor();

  LOG(ERROR) << \"DIAG OnEstablishedGpuChannel: is_gpu_compositing_disabled_=\" << is_gpu_compositing_disabled_
             << \" force_sw=\" << compositor->force_software_compositor()
             << \" gpu_compositing=\" << gpu_compositing
             << \" widget=\" << compositor->widget();
  if (gpu_compositing) {
    auto context_result = TryCreateContextsForGpuCompositing(gpu_channel_host);'''

if old not in content:
    print('WARNING: OnEstablishedGpuChannel pattern not found')
else:
    content = content.replace(old, new)
    with open('$FILE', 'w') as f:
        f.write(content)
    print('OK: Patched OnEstablishedGpuChannel')
"

echo "--- viz_process_transport_factory.cc done ---"

# ============================================================
# 3. compositor_util.cc — trace feature status reporting
# ============================================================
FILE="$SRCDIR/content/browser/gpu/compositor_util.cc"

# Patch GetFeatureStatusImpl to log
python3 -c "
with open('$FILE', 'r') as f:
    content = f.read()

old = '''  bool is_gpu_compositing_disabled;
  if (type == GpuFeatureInfoType::kCurrent) {
    gpu_access_blocked = !manager->GpuAccessAllowed(&gpu_access_blocked_reason);
    gpu_feature_info = manager->GetGpuFeatureInfo();
    is_gpu_compositing_disabled = manager->IsGpuCompositingDisabled();'''

new = '''  bool is_gpu_compositing_disabled;
  if (type == GpuFeatureInfoType::kCurrent) {
    gpu_access_blocked = !manager->GpuAccessAllowed(&gpu_access_blocked_reason);
    gpu_feature_info = manager->GetGpuFeatureInfo();
    is_gpu_compositing_disabled = manager->IsGpuCompositingDisabled();
    LOG(ERROR) << \"DIAG GetFeatureStatusImpl: gpu_access_blocked=\" << gpu_access_blocked
               << \" is_gpu_compositing_disabled=\" << is_gpu_compositing_disabled
               << \" feat_init=\" << gpu_feature_info.IsInitialized()
               << \" ACCEL_GL=\" << (gpu_feature_info.IsInitialized() ? gpu_feature_info.status_values[gpu::GPU_FEATURE_TYPE_ACCELERATED_GL] : -1);'''

if old not in content:
    print('WARNING: GetFeatureStatusImpl pattern not found')
else:
    content = content.replace(old, new)
    with open('$FILE', 'w') as f:
        f.write(content)
    print('OK: Patched GetFeatureStatusImpl')
"

echo "--- compositor_util.cc done ---"
echo "All diagnostic patches applied successfully."
