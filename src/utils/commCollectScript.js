function toInt(value, fallback) {
  const num = Number(value);
  return Number.isFinite(num) ? Math.trunc(num) : fallback;
}

function cleanText(value, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

const DEFAULT_PROFILE_LIB_DIR = "/thfs3/home/xjtu_cx/hzq/lib";

function uniqNonEmpty(arr) {
  return (arr || [])
    .map((item) => cleanText(item))
    .filter(Boolean)
    .filter((item, index, source) => source.indexOf(item) === index);
}

function normalizePairs(arr) {
  return (arr || [])
    .map((item) => ({
      key: cleanText(item?.key),
      value: cleanText(item?.value),
    }))
    .filter((item) => item.key && item.key !== "THRESHOLD");
}

function escapeDoubleQuotes(value) {
  return String(value ?? "").replace(/\\/g, "\\\\").replace(/\"/g, "\\\"");
}

function trimTrailingSlash(value) {
  return String(value ?? "").replace(/\/+$/, "");
}

function posixJoin(...parts) {
  const values = parts
    .map((item) => cleanText(item))
    .filter(Boolean)
    .map((item, index) => {
      const text = trimTrailingSlash(item);
      return index === 0 ? text : text.replace(/^\/+/, "");
    });
  return values.join("/");
}

function posixBaseName(value) {
  const text = trimTrailingSlash(cleanText(value));
  if (!text) return "";
  const parts = text.split("/").filter(Boolean);
  return parts[parts.length - 1] || "";
}

function inferProfileLibDir(workHome) {
  return DEFAULT_PROFILE_LIB_DIR;
}

function inferProfileSourcePath(workHome, profileLibDir) {
  const baseDir = profileLibDir || inferProfileLibDir(workHome);
  return baseDir ? posixJoin(baseDir, "profile.c") : "";
}

function looksLikeLammpsApp(appHome) {
  return /(^|\/)lammps(\/|$)/i.test(cleanText(appHome));
}

function inferAppBin(appHome) {
  return looksLikeLammpsApp(appHome) ? posixJoin(appHome, "src/bin/lmp_mpi") : "";
}

function inferAppModule(appHome) {
  if (!looksLikeLammpsApp(appHome)) return "";
  const version = posixBaseName(appHome);
  return version ? `lammps/${version}` : "";
}

function isLammpsApp(appBin, appHome) {
  const text = `${cleanText(appBin)} ${cleanText(appHome)}`.toLowerCase();
  return text.includes("lammps") || text.endsWith("lmp_mpi") || text.includes("/lmp_mpi");
}

function ensureDefaultAppArgs(appArgs, appBin, appHome) {
  const values = uniqNonEmpty(appArgs);
  if (isLammpsApp(appBin, appHome) && !values.includes("-log")) {
    values.push("-log", "${INTERCEPT_LOG_PATH}/log.lammps");
  }
  return values;
}

function resolveInputFile(workHome, inputFile) {
  const path = cleanText(inputFile);
  if (!path) return "";
  if (path.startsWith("/")) return path;
  return workHome ? posixJoin(workHome, path) : path;
}

export function normalizeCommCollectPayload(form) {
  const name = cleanText(form.name, "comm_collect");
  const nodes = Math.max(1, toInt(form.nodes, 1));
  const ntasksPerNode = Math.max(1, toInt(form.ntasks_per_node ?? form.ntasksPerNode, 1));
  const computedNtasks = nodes * ntasksPerNode;
  const ntasks = form.auto_ntasks === false
    ? Math.max(1, toInt(form.ntasks, computedNtasks))
    : computedNtasks;
  const workHome = cleanText(form.work_home ?? form.workHome);
  const stdoutPath = cleanText(form.stdout_path, workHome ? `${workHome}/slurm.logs/${name}-%j.out` : "");
  const stderrPath = cleanText(form.stderr_path, workHome ? `${workHome}/slurm.logs/${name}-%j.err` : "");
  const interceptLogBase = cleanText(form.intercept_log_base, workHome ? `${workHome}/logs` : "");
  const profileLibDir = cleanText(form.profile_lib_dir, inferProfileLibDir(workHome));
  const profileSourcePath = cleanText(form.profile_source_path, inferProfileSourcePath(workHome, profileLibDir));
  const appHome = cleanText(form.app_home ?? form.appHome);
  const appBin = cleanText(form.app_bin ?? form.appEntry, inferAppBin(appHome));
  const appModule = cleanText(form.app_module, inferAppModule(appHome));
  const inputFile = resolveInputFile(workHome, form.input_file);
  const appArgs = ensureDefaultAppArgs(form.app_args, appBin, appHome);

  const payload = {
    name,
    partition: cleanText(form.partition, "normal"),
    nodes,
    ntasks,
    ntasks_per_node: ntasksPerNode,
    time_limit: cleanText(form.time_limit ?? form.timeLimit),
    stdout_path: stdoutPath,
    stderr_path: stderrPath,
    work_home: workHome,
    app_home: appHome,
    app_bin: appBin,
    input_file: inputFile,
    profile_source_path: profileSourcePath,
    profile_lib_dir: profileLibDir,
    intercept_log_base: interceptLogBase,
    mpi_lib: cleanText(form.mpi_lib, "mpich"),
    gcc_module: cleanText(form.gcc_module, "GCC/9.3.0"),
    mpi_module_mpich: cleanText(form.mpi_module_mpich, "mpich/mpi-x-gcc9.3.0"),
    mpi_module_ompi: cleanText(form.mpi_module_ompi, "openmpi/mpi-x-gcc9.3.0"),
    app_module: appModule,
    module_purge: form.module_purge !== false,
    extra_module_loads: uniqNonEmpty(form.extra_module_loads),
    extra_module_unloads: uniqNonEmpty(form.extra_module_unloads),
    threshold: Math.max(0, toInt(form.threshold, 100000)),
    ld_preload_mode: cleanText(form.ld_preload_mode, "auto"),
    ld_preload_value: cleanText(form.ld_preload_value),
    extra_env_exports: normalizePairs(form.extra_env_exports),
    launcher: "srun",
    srun_mpi_type: cleanText(form.srun_mpi_type, "pmix_v3"),
    launcher_args: normalizePairs(form.launcher_args),
    app_args: appArgs,
    script_mode: cleanText(form.script_mode, "template"),
    generated_script: String(form.generated_script ?? ""),
    final_script: String(form.final_script ?? ""),
    cleanup_on_fail: !!form.cleanup_on_fail,
    ignore_precheck_failure: !!form.ignore_precheck_failure,
  };

  return payload;
}

export function generateCommCollectionScript(cfg) {
  const mpiModule = cfg.mpi_lib === "ompi" ? cfg.mpi_module_ompi : cfg.mpi_module_mpich;
  const ldPreload = cfg.ld_preload_mode === "manual"
    ? cfg.ld_preload_value
    : `${cfg.profile_lib_dir}/libprofile_${cfg.mpi_lib}.so`;

  const moduleLines = [];
  if (cfg.module_purge) moduleLines.push("module purge");
  if (cfg.gcc_module) moduleLines.push(`module load ${cfg.gcc_module}`);
  if (mpiModule) moduleLines.push(`module load ${mpiModule}`);
  if (cfg.app_module) moduleLines.push(`module load ${cfg.app_module}`);
  for (const mod of cfg.extra_module_loads || []) moduleLines.push(`module load ${mod}`);
  for (const mod of cfg.extra_module_unloads || []) moduleLines.push(`module rm ${mod}`);

  const exportLines = [];
  for (const item of cfg.extra_env_exports || []) {
    exportLines.push(`export ${item.key}="${escapeDoubleQuotes(item.value)}"`);
  }

  const launcherArgLines = [];
  for (const item of cfg.launcher_args || []) {
    launcherArgLines.push(`  "${escapeDoubleQuotes(item.key)}"`);
    if (item.value) launcherArgLines.push(`  "${escapeDoubleQuotes(item.value)}"`);
  }

  const appArgLines = (cfg.app_args || []).map((item) => `  "${escapeDoubleQuotes(item)}"`);
  const inputLines = cfg.input_file ? ['  "-in"', '  "${input_file}"'] : [];
  const cleanupBlock = cfg.cleanup_on_fail ? '  rm -rf "${INTERCEPT_LOG_PATH}"' : "";

  return `#!/bin/bash
#SBATCH --job-name=${cfg.name}
#SBATCH --partition=${cfg.partition}
#SBATCH --nodes=${cfg.nodes}
#SBATCH --ntasks=${cfg.ntasks}
#SBATCH --ntasks-per-node=${cfg.ntasks_per_node}
#SBATCH --output=${cfg.stdout_path}
#SBATCH --error=${cfg.stderr_path}
${cfg.time_limit ? `#SBATCH --time=${cfg.time_limit}` : ""}
set -u
job_id=${'${SLURM_JOB_ID}'}
archive_name="${cfg.name}_${cfg.nodes}node_${cfg.ntasks}proc_${'${job_id}'}"
node_list=$(scontrol show hostnames "${'${SLURM_JOB_NODELIST}'}" | paste -sd, -)
work_home="${escapeDoubleQuotes(cfg.work_home)}"
app_home="${escapeDoubleQuotes(cfg.app_home)}"
app_bin="${escapeDoubleQuotes(cfg.app_bin)}"
input_file="${escapeDoubleQuotes(cfg.input_file)}"
input_dir=$(dirname "${'${input_file}'}")
profile_source_path="${escapeDoubleQuotes(cfg.profile_source_path)}"
export THRESHOLD="${cfg.threshold}"
export LD_PRELOAD="${escapeDoubleQuotes(ldPreload)}"
export INTERCEPT_LOG_PATH="${escapeDoubleQuotes(cfg.intercept_log_base)}/${'${archive_name}'}"
mkdir -p "${'${INTERCEPT_LOG_PATH}'}"

if ! command -v module >/dev/null 2>&1; then
  set +u
  if [ -f /etc/profile.d/modules.sh ]; then
    . /etc/profile.d/modules.sh
  elif [ -f /usr/share/Modules/init/bash ]; then
    . /usr/share/Modules/init/bash
  elif [ -f /etc/profile ]; then
    . /etc/profile
  fi
  set -u
fi

cd "${'${input_dir}'}"

${moduleLines.join("\n")}
${exportLines.join("\n")}

label_csv=$(grep -E "^[[:space:]]*#define[[:space:]]+TYPE_[A-Za-z0-9_]+" "${'${profile_source_path}'}" | awk '{print $2}' | paste -sd, -)
outline_path="${'${INTERCEPT_LOG_PATH}'}/outline.csv"
{
  echo "node_list,${'${node_list}'}"
  echo "node_num,${'${SLURM_JOB_NUM_NODES:-' + cfg.nodes + '}'}"
  echo "ntasks,${'${SLURM_NTASKS:-' + cfg.ntasks + '}'}"
  echo "ntasks_per_node,${'${SLURM_NTASKS_PER_NODE:-' + cfg.ntasks_per_node + '}'}"
  if [ -n "${'${label_csv}'}" ]; then
    printf "rank,%s,rank_max_comm_time_s\\n" "${'${label_csv}'}"
  else
    echo "rank,rank_max_comm_time_s"
  fi
} > "${'${outline_path}'}"

exec_cmd=(
  "srun"
  "--mpi=${escapeDoubleQuotes(cfg.srun_mpi_type)}"
${launcherArgLines.join("\n")}
  "${'${app_bin}'}"
${inputLines.join("\n")}
${appArgLines.join("\n")}
)

set +e
"${'${exec_cmd[@]}'}"
cmd_status=$?
set -e
if [ "${'${cmd_status}'}" -ne 0 ]; then
  echo "collection command failed: ${'${cmd_status}'}"
${cleanupBlock}
  exit "${'${cmd_status}'}"
fi
exit 0
`;
}

export function generateSubScript(cfg) {
  return generateCommCollectionScript(cfg);
}
