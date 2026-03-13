<template>
  <div class="comm-collection-tasks">
    <el-card>
      <template #header>
        <div class="header-row">
          <span>采集任务列表</span>
          <div class="header-actions">
            <el-input
              v-model="query"
              size="small"
              placeholder="搜索任务名称"
              clearable
              style="width: 220px"
              @keyup.enter="refresh"
            />
            <el-select v-model="status" size="small" clearable placeholder="状态" style="width: 160px">
              <el-option label="submitted" value="submitted" />
              <el-option label="running" value="running" />
              <el-option label="completed" value="completed" />
              <el-option label="archiving" value="archiving" />
              <el-option label="archived" value="archived" />
              <el-option label="failed" value="failed" />
            </el-select>
            <el-button size="small" type="primary" @click="refresh">刷新</el-button>
          </div>
        </div>
      </template>

      <el-table :data="rows" border size="small" v-loading="loading">
        <el-table-column prop="name" label="名称" min-width="220" show-overflow-tooltip />
        <el-table-column prop="created_at" label="提交时间" width="170" />
        <el-table-column prop="status" label="状态" width="110">
          <template #default="scope">
            <el-tag :type="statusTagType(scope.row.status)">{{ scope.row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="proc_num" label="进程数" width="90" />
        <el-table-column prop="slurm_job_id" label="Slurm Job" width="110" />
        <el-table-column prop="max_of_rank_max_comm_time_s" label="最大通信时间(s)" width="150">
          <template #default="scope">
            <span v-if="scope.row.max_of_rank_max_comm_time_s != null">{{ Number(scope.row.max_of_rank_max_comm_time_s).toFixed(6) }}</span>
            <span v-else style="color:#999">-</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="scope">
            <el-button size="small" type="primary" @click="openDetail(scope.row)">查看</el-button>
            <el-button
              size="small"
              type="success"
              plain
              :disabled="scope.row.status !== 'archived'"
              @click="downloadArchive(scope.row)"
            >
              下载归档
            </el-button>
            <el-popconfirm title="确定删除该任务及其归档吗？" @confirm="deleteTask(scope.row)">
              <template #reference>
                <el-button size="small" type="danger" plain>删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>

      <div class="pager">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="total"
          layout="total, prev, pager, next, sizes"
          :page-sizes="[10, 20, 50]"
          small
          @current-change="refresh"
          @size-change="refresh"
        />
      </div>
    </el-card>

    <el-drawer
      v-model="detailVisible"
      size="50%"
      title="采集任务详情"
      destroy-on-close
      @opened="handleDrawerOpened"
      @closed="handleDrawerClosed"
    >
      <template v-if="detail">
        <el-descriptions :column="1" border size="small">
          <el-descriptions-item label="名称">{{ detail.name }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="statusTagType(detail.status)">{{ detail.status }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="脚本模式">{{ detail.script_mode || '-' }}</el-descriptions-item>
          <el-descriptions-item label="采集任务ID">{{ detail.collection_id }}</el-descriptions-item>
          <el-descriptions-item label="Slurm Job">{{ detail.slurm_job_id || '-' }}</el-descriptions-item>
          <el-descriptions-item label="进程数">{{ detail.proc_num ?? '-' }}</el-descriptions-item>
          <el-descriptions-item label="work_home">{{ detail.work_home || '-' }}</el-descriptions-item>
          <el-descriptions-item label="app_home">{{ detail.app_home || '-' }}</el-descriptions-item>
          <el-descriptions-item label="app_bin">{{ detail.app_bin || '-' }}</el-descriptions-item>
          <el-descriptions-item label="input_file">{{ detail.input_file || '-' }}</el-descriptions-item>
          <el-descriptions-item label="mpi_lib">{{ detail.mpi_lib || '-' }}</el-descriptions-item>
          <el-descriptions-item label="threshold">{{ detail.threshold ?? '-' }}</el-descriptions-item>
          <el-descriptions-item label="stdout_path">{{ detail.stdout_path || '-' }}</el-descriptions-item>
          <el-descriptions-item label="stderr_path">{{ detail.stderr_path || '-' }}</el-descriptions-item>
          <el-descriptions-item label="远端路径">{{ detail.remote_intercept_log_path || '-' }}</el-descriptions-item>
          <el-descriptions-item label="归档包">
            <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
              <span style="color:#666">{{ detail.local_archive_path || '-' }}</span>
              <el-button
                size="small"
                type="success"
                plain
                :disabled="detail.status !== 'archived'"
                @click="downloadArchive(detail)"
              >
                下载归档
              </el-button>
            </div>
          </el-descriptions-item>
          <el-descriptions-item label="最大通信时间(s)">
            <span v-if="detail.max_of_rank_max_comm_time_s != null">{{ Number(detail.max_of_rank_max_comm_time_s).toFixed(6) }}</span>
            <span v-else>-</span>
            <span v-if="detail.rank_of_max != null" style="color:#666; margin-left:12px;">(rank={{ detail.rank_of_max }})</span>
          </el-descriptions-item>
        </el-descriptions>

        <el-divider />

        <el-alert
          v-if="detail.validation_report && !detail.validation_report.ok"
          title="本次任务提交前预检查未通过或被忽略，请重点核对下方校验结果。"
          type="warning"
          :closable="false"
          style="margin-bottom: 16px"
        />

        <el-descriptions v-if="detail.validation_report" :column="1" border size="small">
          <el-descriptions-item label="静态错误">
            <div v-if="!(detail.validation_report.static?.errors || []).length">-</div>
            <div v-for="(item, idx) in detail.validation_report.static?.errors || []" :key="`se-${idx}`">{{ item }}</div>
          </el-descriptions-item>
          <el-descriptions-item label="静态告警">
            <div v-if="!(detail.validation_report.static?.warnings || []).length">-</div>
            <div v-for="(item, idx) in detail.validation_report.static?.warnings || []" :key="`sw-${idx}`">{{ item }}</div>
          </el-descriptions-item>
          <el-descriptions-item label="远端预检查">
            <div v-if="!(detail.validation_report.remote?.checks || []).length">-</div>
            <div v-for="(item, idx) in detail.validation_report.remote?.checks || []" :key="`rc-${idx}`">
              {{ item.name }}: {{ item.message }}
            </div>
          </el-descriptions-item>
        </el-descriptions>

        <el-divider />

        <div style="display:flex; gap:10px;">
          <el-button size="small" type="primary" @click="refreshDetail">刷新状态</el-button>
          <el-button
            size="small"
            type="warning"
            plain
            :disabled="!canSyncArchive(detail)"
            @click="syncArchive"
          >
            归档/重试归档
          </el-button>
        </div>

        <CommTimeline
          v-if="detail?.status === 'archived'"
          :collection-id="detail.collection_id"
          :visible="detailVisible"
          :activate-key="timelineActivateKey"
        />

        <el-divider />

        <el-form label-width="120px" size="small">
          <el-form-item label="模板脚本">
            <el-input type="textarea" :rows="10" readonly :value="detail.generated_script || '暂无'" />
          </el-form-item>
          <el-form-item label="最终脚本">
            <el-input type="textarea" :rows="14" readonly :value="detail.final_script || '暂无'" />
          </el-form-item>
        </el-form>

        <el-divider />

        <el-form label-width="120px" size="small">
          <el-form-item label="日志(末尾)">
            <el-input type="textarea" :rows="12" readonly :value="detail.log_tail || '暂无'" />
          </el-form-item>
        </el-form>
      </template>
    </el-drawer>
  </div>
</template>

<script setup>
import { ref, onBeforeUnmount } from "vue";
import { ElMessage } from "element-plus";
import axios from "axios";
import CommTimeline from "@/components/COMM/CommTimeline.vue";

const query = ref("");
const status = ref("");
const page = ref(1);
const pageSize = ref(10);
const total = ref(0);
const rows = ref([]);
const loading = ref(false);

const detailVisible = ref(false);
const detail = ref(null);
const timelineActivateKey = ref(0);
let detailPollTimer = null;

function triggerTimelineReload() {
  timelineActivateKey.value += 1;
}

function statusTagType(s) {
  if (s === "archived") return "success";
  if (s === "failed") return "danger";
  if (s === "running" || s === "archiving") return "warning";
  if (s === "completed") return "info";
  return "";
}

function canSyncArchive(row) {
  if (!row) return false;
  return ["completed", "failed", "archived"].includes(row.status);
}

async function refresh() {
  loading.value = true;
  try {
    const resp = await axios.get("/api/mt3000/comm/collections", {
      params: {
        page: page.value,
        page_size: pageSize.value,
        query: query.value || undefined,
        status: status.value || undefined,
      },
    });
    if (resp.data?.status !== "success") throw new Error(resp.data?.message || "查询失败");
    rows.value = resp.data.data?.items || [];
    total.value = resp.data.data?.total || 0;
  } catch (e) {
    ElMessage.error("获取任务列表失败：" + (e?.message || "未知错误"));
  } finally {
    loading.value = false;
  }
}

function stopDetailPolling() {
  if (detailPollTimer) {
    clearInterval(detailPollTimer);
    detailPollTimer = null;
  }
}

async function openDetail(row) {
  detailVisible.value = true;
  await loadDetail(row.collection_id);
  startDetailPolling();
}

function handleDrawerOpened() {
  triggerTimelineReload();
}

function handleDrawerClosed() {
  stopDetailPolling();
}

async function loadDetail(collectionId) {
  const resp = await axios.get(`/api/mt3000/comm/collections/${collectionId}`);
  if (resp.data?.status !== "success") throw new Error(resp.data?.message || "查询失败");
  detail.value = resp.data.data;
}

function startDetailPolling() {
  stopDetailPolling();
  detailPollTimer = setInterval(async () => {
    if (!detailVisible.value || !detail.value?.collection_id) return;
    const s = detail.value.status;
    if (s !== "submitted" && s !== "running" && s !== "archiving" && s !== "completed") return;
    try {
      await refreshDetail(true);
    } catch {
      // ignore
    }
  }, 3000);
}

async function refreshDetail(silent = false) {
  if (!detail.value?.collection_id) return;
  try {
    await loadDetail(detail.value.collection_id);
    if (detail.value?.status === "archived" && detail.value?.local_archive_path) {
      triggerTimelineReload();
    }
    if (!silent) ElMessage.success("已刷新");
    if (detail.value.status === "archived" || detail.value.status === "failed") stopDetailPolling();
  } catch (e) {
    if (!silent) ElMessage.error("刷新失败：" + (e?.message || "未知错误"));
  }
}

async function syncArchive() {
  if (!detail.value?.collection_id) return;
  if (!canSyncArchive(detail.value)) {
    ElMessage.warning(`当前状态 ${detail.value.status} 不支持归档`);
    return;
  }
  try {
    const resp = await axios.post(`/api/mt3000/comm/collections/${detail.value.collection_id}/sync-archive`);
    if (resp.data?.status !== "success") throw new Error(resp.data?.message || "归档失败");
    ElMessage.success("已触发归档");
    await refreshDetail(true);
    triggerTimelineReload();
  } catch (e) {
    ElMessage.error("归档触发失败：" + (e?.message || "未知错误"));
  }
}

async function downloadArchive(row) {
  const collectionId = row.collection_id;
  try {
    const resp = await axios.get(`/api/mt3000/comm/collections/${collectionId}/download`, {
      responseType: "blob",
      validateStatus: () => true,
    });

    if (resp.status !== 200) {
      ElMessage.error(`下载失败(${resp.status})`);
      return;
    }

    const cd = resp.headers?.["content-disposition"] || resp.headers?.get?.("content-disposition");
    let filename = `comm_collection_${collectionId}.tar.gz`;
    if (typeof cd === "string") {
      const m = cd.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i);
      filename = decodeURIComponent(m?.[1] || m?.[2] || filename);
    }

    const blob = resp.data instanceof Blob ? resp.data : new Blob([resp.data]);
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  } catch (e) {
    ElMessage.error("下载失败：" + (e?.message || "未知错误"));
  }
}

async function deleteTask(row) {
  try {
    const resp = await axios.delete(`/api/mt3000/comm/collections/${row.collection_id}`);
    if (resp.data?.status !== "success") throw new Error(resp.data?.message || "删除失败");
    ElMessage.success("已删除");
    if (detail.value?.collection_id === row.collection_id) {
      detailVisible.value = false;
      detail.value = null;
      stopDetailPolling();
    }
    await refresh();
  } catch (e) {
    ElMessage.error("删除失败：" + (e?.message || "未知错误"));
  }
}

onBeforeUnmount(() => {
  stopDetailPolling();
});

refresh();
</script>

<style scoped>
.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.header-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}
.pager {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
}
</style>
