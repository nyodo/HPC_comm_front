<template>
  <div class="comm-collection-content">
    <el-card>
      <template #header>
        <div class="header-row">
          <div>
            <div class="header-title">天津超算通信数据采集</div>
            <div class="header-subtitle">结构化表单生成脚本，提交时以后端收到的最终脚本文本为准。</div>
          </div>
          <el-tag type="info">srun + LD_PRELOAD + outline.csv</el-tag>
        </div>
      </template>

      <el-form ref="commFormRef" :model="commForm" :rules="commRules" label-width="170px" size="small" status-icon>
        <el-divider content-position="left">作业资源</el-divider>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="作业名称" prop="name">
              <el-input v-model="commForm.name" clearable />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="分区" prop="partition">
              <el-input v-model="commForm.partition" clearable placeholder="例如：thcp3" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="节点数" prop="nodes">
              <el-input-number v-model="commForm.nodes" :min="1" :max="4096" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="每节点进程数" prop="ntasks_per_node">
              <el-input-number v-model="commForm.ntasks_per_node" :min="1" :max="256" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="自动计算总进程数">
              <el-switch v-model="commForm.auto_ntasks" active-text="自动" inactive-text="手工" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="总进程数" prop="ntasks">
              <el-input-number v-model="commForm.ntasks" :min="1" :disabled="commForm.auto_ntasks" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="时限">
              <el-input v-model="commForm.time_limit" clearable placeholder="例如：02:00:00" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="标准输出路径" prop="stdout_path">
              <el-input v-model="commForm.stdout_path" clearable placeholder="例如：/thfs3/home/user/slurm.logs/job-%j.out" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="标准错误路径" prop="stderr_path">
              <el-input v-model="commForm.stderr_path" clearable placeholder="例如：/thfs3/home/user/slurm.logs/job-%j.err" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">路径与程序</el-divider>
        <el-row :gutter="20">
          <el-col :span="24">
            <el-form-item label="work_home" prop="work_home">
              <el-input v-model="commForm.work_home" clearable />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="app_home" prop="app_home">
              <el-input v-model="commForm.app_home" clearable />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="app_bin" prop="app_bin">
              <el-input v-model="commForm.app_bin" clearable placeholder="LAMMPS 默认按 app_home 自动补全为 .../src/bin/lmp_mpi" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="input_file" prop="input_file">
              <el-input v-model="commForm.input_file" clearable />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="intercept_log_base" prop="intercept_log_base">
              <el-input v-model="commForm.intercept_log_base" clearable placeholder="默认取 work_home/logs" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="profile_source_path" prop="profile_source_path">
              <el-input v-model="commForm.profile_source_path" clearable placeholder="默认取 /thfs3/home/xjtu_cx/hzq/lib/profile.c" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="profile_lib_dir" prop="profile_lib_dir">
              <el-input v-model="commForm.profile_lib_dir" clearable placeholder="默认取 /thfs3/home/xjtu_cx/hzq/lib" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">MPI 与模块</el-divider>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="mpi_lib" prop="mpi_lib">
              <el-select v-model="commForm.mpi_lib">
                <el-option label="mpich" value="mpich" />
                <el-option label="ompi" value="ompi" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="module purge">
              <el-switch v-model="commForm.module_purge" active-text="开启" inactive-text="关闭" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="失败清理日志">
              <el-switch v-model="commForm.cleanup_on_fail" active-text="开启" inactive-text="关闭" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="gcc_module">
              <el-input v-model="commForm.gcc_module" clearable />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="app_module">
              <el-input v-model="commForm.app_module" clearable placeholder="LAMMPS 默认按 app_home 自动补全为 lammps/版本目录" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="mpi_module_mpich">
              <el-input v-model="commForm.mpi_module_mpich" clearable />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="mpi_module_ompi">
              <el-input v-model="commForm.mpi_module_ompi" clearable />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="额外加载模块">
              <el-card shadow="never" class="params-card">
                <div v-for="(_, idx) in commForm.extra_module_loads" :key="`load-${idx}`" class="param-row">
                  <el-input v-model="commForm.extra_module_loads[idx]" clearable />
                  <el-button type="danger" plain size="small" @click="removeListItem('extra_module_loads', idx)">删除</el-button>
                </div>
                <div class="param-row-actions">
                  <el-button size="small" @click="addListItem('extra_module_loads')">添加模块</el-button>
                </div>
              </el-card>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="额外卸载模块">
              <el-card shadow="never" class="params-card">
                <div v-for="(_, idx) in commForm.extra_module_unloads" :key="`unload-${idx}`" class="param-row">
                  <el-input v-model="commForm.extra_module_unloads[idx]" clearable />
                  <el-button type="danger" plain size="small" @click="removeListItem('extra_module_unloads', idx)">删除</el-button>
                </div>
                <div class="param-row-actions">
                  <el-button size="small" @click="addListItem('extra_module_unloads')">添加模块</el-button>
                </div>
              </el-card>
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">插桩与环境</el-divider>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="threshold" prop="threshold">
              <el-input-number v-model="commForm.threshold" :min="0" :max="999999999" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="LD_PRELOAD 模式">
              <el-select v-model="commForm.ld_preload_mode">
                <el-option label="自动生成" value="auto" />
                <el-option label="手工填写" value="manual" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="忽略预检查失败">
              <el-switch v-model="commForm.ignore_precheck_failure" active-text="允许" inactive-text="阻止" />
            </el-form-item>
          </el-col>
          <el-col :span="24" v-if="commForm.ld_preload_mode === 'manual'">
            <el-form-item label="ld_preload_value">
              <el-input v-model="commForm.ld_preload_value" clearable />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="额外环境变量">
              <el-card shadow="never" class="params-card">
                <div v-for="(_, idx) in commForm.extra_env_exports" :key="`env-${idx}`" class="param-row pair-row">
                  <el-input v-model="commForm.extra_env_exports[idx].key" clearable placeholder="变量名" />
                  <el-input v-model="commForm.extra_env_exports[idx].value" clearable placeholder="变量值" />
                  <el-button type="danger" plain size="small" @click="removePairItem('extra_env_exports', idx)">删除</el-button>
                </div>
                <div class="param-row-actions">
                  <el-button size="small" @click="addPairItem('extra_env_exports')">添加环境变量</el-button>
                </div>
              </el-card>
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">执行命令</el-divider>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="launcher">
              <el-input v-model="commForm.launcher" disabled />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="srun_mpi_type" prop="srun_mpi_type">
              <el-input v-model="commForm.srun_mpi_type" clearable />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="launcher_args">
              <el-card shadow="never" class="params-card">
                <div v-for="(_, idx) in commForm.launcher_args" :key="`launcher-${idx}`" class="param-row pair-row">
                  <el-input v-model="commForm.launcher_args[idx].key" clearable placeholder="参数名" />
                  <el-input v-model="commForm.launcher_args[idx].value" clearable placeholder="参数值，可空" />
                  <el-button type="danger" plain size="small" @click="removePairItem('launcher_args', idx)">删除</el-button>
                </div>
                <div class="param-row-actions">
                  <el-button size="small" @click="addPairItem('launcher_args')">添加参数</el-button>
                </div>
              </el-card>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="app_args">
              <el-card shadow="never" class="params-card">
                <div v-for="(_, idx) in commForm.app_args" :key="`app-${idx}`" class="param-row">
                  <el-input v-model="commForm.app_args[idx]" clearable />
                  <el-button type="danger" plain size="small" @click="removeListItem('app_args', idx)">删除</el-button>
                </div>
                <div class="param-row-actions">
                  <el-button size="small" @click="addListItem('app_args')">添加参数</el-button>
                </div>
              </el-card>
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">脚本预览与整脚本编辑</el-divider>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="脚本模式">
              <el-radio-group v-model="commForm.script_mode">
                <el-radio-button label="template">template</el-radio-button>
                <el-radio-button label="override">override</el-radio-button>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="16" class="script-tip">
            如果表单内容与实际超算脚本不完全一致，请在下方最终脚本中直接修改；提交时以后端收到的最终脚本文本为准。
          </el-col>
          <el-col :span="24">
            <el-form-item label="模板脚本">
              <el-input v-model="commForm.generated_script" type="textarea" :rows="14" readonly />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="最终脚本" prop="final_script">
              <el-input v-model="commForm.final_script" type="textarea" :rows="18" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item>
          <el-button type="primary" @click="generateScript">生成脚本</el-button>
          <el-button @click="refreshFinalScript">从模板刷新脚本</el-button>
          <el-button type="warning" plain :loading="isChecking" @click="runPrecheck">远端预检查</el-button>
          <el-button type="primary" :loading="isRunning" @click="submitCollection">提交到 MT-3000</el-button>
          <el-button @click="checkStatus" :disabled="!currentCollectionId">检查状态</el-button>
          <el-button @click="saveDraft">保存草稿</el-button>
          <el-button @click="loadDraft">加载草稿</el-button>
          <el-button @click="exportConfigJson">导出 JSON</el-button>
          <el-button @click="downloadScript">导出脚本</el-button>
          <el-button @click="resetForm">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card v-if="precheckReport" style="margin-top: 20px">
      <template #header>
        <div class="header-row">
          <span>预检查结果</span>
          <el-tag :type="precheckReport.ok ? 'success' : 'danger'">{{ precheckReport.ok ? '通过' : '未通过' }}</el-tag>
        </div>
      </template>
      <div class="precheck-block">
        <div class="precheck-column">
          <div class="precheck-title">静态校验</div>
          <div v-if="!precheckReport.static?.errors?.length && !precheckReport.static?.warnings?.length" class="muted-text">无异常</div>
          <div v-for="(item, idx) in precheckReport.static?.errors || []" :key="`se-${idx}`" class="error-text">{{ item }}</div>
          <div v-for="(item, idx) in precheckReport.static?.warnings || []" :key="`sw-${idx}`" class="warning-text">{{ item }}</div>
        </div>
        <div class="precheck-column">
          <div class="precheck-title">远端预检查</div>
          <div v-if="!(precheckReport.remote?.checks || []).length" class="muted-text">尚未执行</div>
          <div v-for="(item, idx) in precheckReport.remote?.checks || []" :key="`rc-${idx}`" :class="item.ok ? 'success-text' : 'error-text'">
            {{ item.name }}: {{ item.message }}
          </div>
        </div>
      </div>
    </el-card>

    <el-card style="margin-top: 20px">
      <template #header><span>任务状态</span></template>
      <el-form label-width="120px" size="small">
        <el-form-item label="任务">
          <el-tag v-if="currentCollectionId">{{ currentCollectionId }}</el-tag>
          <el-tag v-else type="info">未提交</el-tag>
        </el-form-item>
        <el-form-item label="状态">
          <el-tag :type="statusTagType(taskStatus)">{{ taskStatus || (currentCollectionId ? 'unknown' : '未提交') }}</el-tag>
        </el-form-item>
        <el-form-item label="最大通信时间">
          <el-tag v-if="maxCommTimeS != null" type="success">{{ Number(maxCommTimeS).toFixed(6) }} s</el-tag>
          <el-tag v-else type="info">-</el-tag>
          <span v-if="rankOfMax != null" class="status-extra">(rank={{ rankOfMax }})</span>
        </el-form-item>
        <el-form-item label="下载">
          <div class="status-actions">
            <el-button size="small" type="warning" plain :disabled="!currentCollectionId || (taskStatus !== 'completed' && taskStatus !== 'failed')" @click="syncArchive">归档/重试归档</el-button>
            <el-button size="small" type="primary" :disabled="taskStatus !== 'archived'" @click="downloadArchive">下载归档包</el-button>
          </div>
        </el-form-item>
        <el-form-item label="日志">
          <el-input type="textarea" :rows="12" readonly :value="outputLog || '暂无日志输出...'" />
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { onBeforeUnmount, reactive, ref, watch } from "vue";
import { ElMessage } from "element-plus";
import axios from "axios";
import { generateCommCollectionScript, normalizeCommCollectPayload } from "@/utils/commCollectScript.js";

const DRAFT_KEY_V2 = "comm_collect_draft_v2";
const LEGACY_DRAFT_KEY = "comm_collect_draft";
const DEFAULT_PROFILE_LIB_DIR = "/thfs3/home/xjtu_cx/hzq/lib";

const commFormRef = ref(null);
const isRunning = ref(false);
const isChecking = ref(false);
const outputLog = ref("");
const currentCollectionId = ref(null);
const taskStatus = ref("");
const maxCommTimeS = ref(null);
const rankOfMax = ref(null);
const precheckReport = ref(null);
let statusPollingTimer = null;

const initForm = () => ({
  name: "",
  partition: "thcp3",
  nodes: 4,
  ntasks: 16,
  ntasks_per_node: 4,
  auto_ntasks: true,
  time_limit: "",
  stdout_path: "",
  stderr_path: "",
  work_home: "",
  app_home: "",
  app_bin: "",
  input_file: "",
  profile_source_path: "",
  profile_lib_dir: "",
  intercept_log_base: "",
  mpi_lib: "mpich",
  gcc_module: "GCC/9.3.0",
  mpi_module_mpich: "mpich/mpi-x-gcc9.3.0",
  mpi_module_ompi: "openmpi/mpi-x-gcc9.3.0",
  app_module: "",
  module_purge: true,
  extra_module_loads: [],
  extra_module_unloads: [],
  threshold: 100000,
  ld_preload_mode: "auto",
  ld_preload_value: "",
  extra_env_exports: [],
  launcher: "srun",
  srun_mpi_type: "pmix_v3",
  launcher_args: [],
  app_args: [],
  script_mode: "template",
  generated_script: "",
  final_script: "",
  cleanup_on_fail: false,
  ignore_precheck_failure: false,
});

const commForm = reactive(initForm());
const derivedDefaults = {
  intercept_log_base: "",
  stdout_path: "",
  stderr_path: "",
  profile_lib_dir: "",
  profile_source_path: "",
  app_bin: "",
  app_module: "",
};

const commRules = {
  name: [{ required: true, message: "请输入作业名称", trigger: "blur" }],
  partition: [{ required: true, message: "请输入分区", trigger: "blur" }],
  nodes: [{ required: true, type: "number", min: 1, message: "节点数必须大于 0", trigger: "change" }],
  ntasks: [{ required: true, type: "number", min: 1, message: "总进程数必须大于 0", trigger: "change" }],
  ntasks_per_node: [{ required: true, type: "number", min: 1, message: "每节点进程数必须大于 0", trigger: "change" }],
  stdout_path: [{ required: true, message: "请输入标准输出路径", trigger: "blur" }],
  stderr_path: [{ required: true, message: "请输入标准错误路径", trigger: "blur" }],
  work_home: [{ required: true, message: "请输入 work_home", trigger: "blur" }],
  app_home: [{ required: true, message: "请输入 app_home", trigger: "blur" }],
  app_bin: [{ required: true, message: "请输入 app_bin", trigger: "blur" }],
  input_file: [{ required: true, message: "请输入 input_file", trigger: "blur" }],
  profile_source_path: [{ required: true, message: "请输入 profile_source_path", trigger: "blur" }],
  profile_lib_dir: [{ required: true, message: "请输入 profile_lib_dir", trigger: "blur" }],
  intercept_log_base: [{ required: true, message: "请输入 intercept_log_base", trigger: "blur" }],
  mpi_lib: [{ required: true, message: "请选择 mpi_lib", trigger: "change" }],
  srun_mpi_type: [{ required: true, message: "请输入 srun_mpi_type", trigger: "blur" }],
  final_script: [{ required: true, message: "最终脚本不能为空", trigger: "blur" }],
};

function statusTagType(status) {
  if (status === "archived") return "success";
  if (status === "failed") return "danger";
  if (status === "running" || status === "archiving") return "warning";
  if (status === "completed") return "info";
  return "";
}

function trimTrailingSlash(value) {
  return String(value ?? "").replace(/\/+$/, "");
}

function posixJoin(...parts) {
  const values = parts
    .map((item) => String(item ?? "").trim())
    .filter(Boolean)
    .map((item, index) => {
      const text = trimTrailingSlash(item);
      return index === 0 ? text : text.replace(/^\/+/, "");
    });
  return values.join("/");
}

function posixBaseName(value) {
  const text = trimTrailingSlash(String(value ?? "").trim());
  if (!text) return "";
  const parts = text.split("/").filter(Boolean);
  return parts[parts.length - 1] || "";
}

function looksLikeLammpsApp(appHome) {
  return /(^|\/)lammps(\/|$)/i.test(String(appHome ?? "").trim());
}

function syncDerivedField(field, nextValue) {
  if (!nextValue) return;
  if (!commForm[field] || commForm[field] === derivedDefaults[field]) {
    commForm[field] = nextValue;
  }
  derivedDefaults[field] = nextValue;
}

function ensureDerivedFields() {
  if (commForm.auto_ntasks) {
    commForm.ntasks = commForm.nodes * commForm.ntasks_per_node;
  }
  if (commForm.work_home) {
    syncDerivedField("intercept_log_base", posixJoin(commForm.work_home, "logs"));
    if (commForm.name) {
      syncDerivedField("stdout_path", posixJoin(commForm.work_home, "slurm.logs", `${commForm.name}-%j.out`));
      syncDerivedField("stderr_path", posixJoin(commForm.work_home, "slurm.logs", `${commForm.name}-%j.err`));
    }
  }
  syncDerivedField("profile_lib_dir", DEFAULT_PROFILE_LIB_DIR);
  if (commForm.profile_lib_dir) {
    syncDerivedField("profile_source_path", posixJoin(commForm.profile_lib_dir, "profile.c"));
  }
  if (commForm.app_home && looksLikeLammpsApp(commForm.app_home)) {
    syncDerivedField("app_bin", posixJoin(commForm.app_home, "src/bin/lmp_mpi"));
    const version = posixBaseName(commForm.app_home);
    if (version) {
      syncDerivedField("app_module", `lammps/${version}`);
    }
  }
}

watch(() => [commForm.nodes, commForm.ntasks_per_node, commForm.auto_ntasks], ensureDerivedFields, { immediate: true });
watch(() => [commForm.work_home, commForm.name, commForm.profile_lib_dir, commForm.app_home], ensureDerivedFields, { immediate: true });

function addListItem(field) {
  commForm[field].push("");
}

function removeListItem(field, index) {
  commForm[field].splice(index, 1);
}

function addPairItem(field) {
  commForm[field].push({ key: "", value: "" });
}

function removePairItem(field, index) {
  commForm[field].splice(index, 1);
}

function buildPayload() {
  ensureDerivedFields();
  const payload = normalizeCommCollectPayload(commForm);
  const generated = generateCommCollectionScript(payload);
  commForm.generated_script = generated;
  if (commForm.script_mode === "template" || !commForm.final_script.trim()) {
    commForm.final_script = generated;
  }
  payload.generated_script = commForm.generated_script;
  payload.final_script = commForm.final_script;
  return payload;
}

function generateScript() {
  try {
    const payload = buildPayload();
    precheckReport.value = null;
    ElMessage.success(payload.script_mode === "override" ? "模板脚本已更新，保留当前最终脚本" : "脚本已生成");
  } catch (error) {
    ElMessage.error(`脚本生成失败：${error?.message || "未知错误"}`);
  }
}

function refreshFinalScript() {
  try {
    const payload = normalizeCommCollectPayload(commForm);
    const generated = generateCommCollectionScript(payload);
    commForm.generated_script = generated;
    commForm.final_script = generated;
    ElMessage.success("最终脚本已按模板刷新");
  } catch (error) {
    ElMessage.error(`刷新失败：${error?.message || "未知错误"}`);
  }
}

async function runPrecheck() {
  buildPayload();
  try {
    await commFormRef.value?.validate?.();
  } catch {
    ElMessage.warning("请先补全必填字段");
    return;
  }

  isChecking.value = true;
  try {
    const payload = buildPayload();
    const response = await axios.post("/api/mt3000/comm/collections/precheck", payload, {
      validateStatus: () => true,
    });
    precheckReport.value = response.data?.data?.validation_report || null;
    if (response.status === 200) {
      commForm.generated_script = response.data?.data?.generated_script || commForm.generated_script;
      if (commForm.script_mode === "template") {
        commForm.final_script = response.data?.data?.final_script || commForm.final_script;
      }
      ElMessage.success("预检查通过");
    } else {
      ElMessage.error(response.data?.message || "预检查未通过");
    }
  } catch (error) {
    ElMessage.error(`预检查失败：${error?.message || "未知错误"}`);
  } finally {
    isChecking.value = false;
  }
}

function copyScript() {
  navigator.clipboard.writeText(commForm.final_script).then(() => ElMessage.success("已复制到剪贴板"));
}

function downloadScript() {
  const content = commForm.final_script || commForm.generated_script;
  if (!content) {
    ElMessage.warning("没有可导出的脚本");
    return;
  }
  const blob = new Blob([content], { type: "text/x-shellscript" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${commForm.name || "comm_collect"}.sbatch`;
  link.click();
  URL.revokeObjectURL(url);
}

function exportConfigJson() {
  const payload = buildPayload();
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${commForm.name || "comm_collect"}_config.json`;
  link.click();
  URL.revokeObjectURL(url);
  ElMessage.success("JSON 已导出");
}

function saveDraft() {
  localStorage.setItem(DRAFT_KEY_V2, JSON.stringify(commForm));
  ElMessage.success("草稿已保存");
}

function applyDraft(raw) {
  const data = JSON.parse(raw);
  Object.assign(commForm, initForm(), data);
  ensureDerivedFields();
}

function migrateLegacyDraft(raw) {
  const legacy = JSON.parse(raw);
  Object.assign(commForm, initForm(), {
    name: legacy.name || "",
    partition: legacy.partition || "thcp3",
    nodes: legacy.nodes || 1,
    ntasks_per_node: legacy.ntasksPerNode || 1,
    ntasks: (legacy.nodes || 1) * (legacy.ntasksPerNode || 1),
    app_home: legacy.appHome || "",
    app_bin: legacy.appEntry || "",
    extra_module_loads: legacy.moduleStrategy === "custom"
      ? (legacy.customModules || []).map((item) => item?.moduleText).filter(Boolean)
      : legacy.presetModules || [],
    extra_module_unloads: legacy.moduleRemoves || [],
    extra_env_exports: (legacy.envExports || []).filter((item) => item?.key !== "THRESHOLD"),
    launcher_args: legacy.mpirunArgs || [],
    cleanup_on_fail: !!legacy.cleanupOnFail,
  });
  ensureDerivedFields();
}

function loadDraft() {
  const latest = localStorage.getItem(DRAFT_KEY_V2);
  if (latest) {
    applyDraft(latest);
    ElMessage.success("已加载 v2 草稿");
    return;
  }
  const legacy = localStorage.getItem(LEGACY_DRAFT_KEY);
  if (legacy) {
    migrateLegacyDraft(legacy);
    ElMessage.success("已迁移旧版草稿");
    return;
  }
  ElMessage.warning("没有找到草稿");
}

function stopStatusPolling() {
  if (statusPollingTimer) {
    clearInterval(statusPollingTimer);
    statusPollingTimer = null;
  }
}

async function submitCollection() {
  buildPayload();
  try {
    await commFormRef.value?.validate?.();
  } catch {
    ElMessage.warning("请先补全必填字段");
    return;
  }

  isRunning.value = true;
  try {
    const payload = buildPayload();
    const response = await axios.post("/api/mt3000/comm/collections", payload, {
      validateStatus: () => true,
      headers: { "Content-Type": "application/json" },
    });
    if (response.status !== 200 || response.data?.status !== "success") {
      precheckReport.value = response.data?.data || precheckReport.value;
      const detail = String(response.data?.detail || "").trim();
      const message = response.data?.message || "任务提交失败";
      throw new Error(detail ? `${message}: ${detail}` : message);
    }
    const data = response.data?.data || {};
    currentCollectionId.value = data.collection_id || null;
    taskStatus.value = data.status || "submitted";
    outputLog.value = "任务已提交，正在监控状态...\n";
    startStatusPolling();
    ElMessage.success("采集任务已提交");
  } catch (error) {
    outputLog.value += `错误：${error?.message || "未知错误"}\n`;
    ElMessage.error(`任务提交失败：${error?.message || "未知错误"}`);
    isRunning.value = false;
  }
}

function startStatusPolling() {
  stopStatusPolling();
  statusPollingTimer = setInterval(async () => {
    try {
      await refreshTask(true);
    } catch {
      // ignore
    }
  }, 3000);
}

async function refreshTask(silent) {
  if (!currentCollectionId.value) return;
  const response = await axios.get(`/api/mt3000/comm/collections/${currentCollectionId.value}`);
  if (response.data?.status !== "success") throw new Error(response.data?.message || "状态查询失败");
  const data = response.data?.data || {};
  taskStatus.value = data.status || taskStatus.value;
  if (typeof data.log_tail === "string") outputLog.value = data.log_tail;
  maxCommTimeS.value = data.max_of_rank_max_comm_time_s ?? null;
  rankOfMax.value = data.rank_of_max ?? null;
  if (!silent) ElMessage.info(`任务状态：${taskStatus.value}`);
  if (taskStatus.value === "completed" || taskStatus.value === "archived" || taskStatus.value === "failed") {
    stopStatusPolling();
    isRunning.value = false;
  }
}

async function checkStatus() {
  if (!currentCollectionId.value) {
    ElMessage.warning("没有任务ID");
    return;
  }
  await refreshTask(false);
}

async function syncArchive() {
  if (!currentCollectionId.value) {
    ElMessage.warning("没有任务ID");
    return;
  }
  try {
    const response = await axios.post(`/api/mt3000/comm/collections/${currentCollectionId.value}/sync-archive`);
    if (response.data?.status !== "success") throw new Error(response.data?.message || "归档失败");
    ElMessage.success("已触发归档");
    await refreshTask(true);
  } catch (error) {
    ElMessage.error(`归档失败：${error?.message || "未知错误"}`);
  }
}

async function downloadArchive() {
  if (!currentCollectionId.value) {
    ElMessage.warning("没有任务ID");
    return;
  }
  try {
    const response = await axios.get(`/api/mt3000/comm/collections/${currentCollectionId.value}/download`, {
      responseType: "blob",
      validateStatus: () => true,
    });
    if (response.status !== 200) {
      ElMessage.error(`下载失败(${response.status})`);
      return;
    }
    const cd = response.headers?.["content-disposition"] || response.headers?.get?.("content-disposition");
    let filename = `comm_collection_${currentCollectionId.value}.tar.gz`;
    if (typeof cd === "string") {
      const match = cd.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i);
      filename = decodeURIComponent(match?.[1] || match?.[2] || filename);
    }
    const blob = response.data instanceof Blob ? response.data : new Blob([response.data]);
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  } catch (error) {
    ElMessage.error(`下载失败：${error?.message || "未知错误"}`);
  }
}

function resetForm() {
  Object.assign(commForm, initForm());
  precheckReport.value = null;
  outputLog.value = "";
  currentCollectionId.value = null;
  taskStatus.value = "";
  maxCommTimeS.value = null;
  rankOfMax.value = null;
  stopStatusPolling();
  isRunning.value = false;
  commFormRef.value?.clearValidate?.();
  ElMessage.info("表单已重置");
}

onBeforeUnmount(() => {
  stopStatusPolling();
});
</script>

<style scoped>
.comm-collection-content {
  padding: 20px;
}

.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.header-title {
  font-size: 18px;
  font-weight: 600;
}

.header-subtitle {
  margin-top: 4px;
  color: #6b7280;
  font-size: 13px;
}

.params-card {
  width: 100%;
}

.param-row {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 10px;
}

.pair-row :deep(.el-input) {
  flex: 1;
}

.param-row-actions {
  display: flex;
  gap: 10px;
}

.script-tip {
  color: #6b7280;
  font-size: 13px;
  line-height: 1.6;
  display: flex;
  align-items: center;
}

.precheck-block {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}

.precheck-column {
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 14px;
}

.precheck-title {
  font-weight: 600;
  margin-bottom: 10px;
}

.muted-text {
  color: #6b7280;
}

.error-text {
  color: #b42318;
  margin-bottom: 6px;
}

.warning-text {
  color: #b54708;
  margin-bottom: 6px;
}

.success-text {
  color: #027a48;
  margin-bottom: 6px;
}

.status-actions {
  display: flex;
  gap: 10px;
}

.status-extra {
  margin-left: 10px;
  color: #6b7280;
}

@media (max-width: 900px) {
  .precheck-block {
    grid-template-columns: 1fr;
  }

  .header-row {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
