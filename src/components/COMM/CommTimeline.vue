<template>
  <el-card shadow="never" class="timeline-card">
    <template #header>
      <div class="timeline-header">
        <span>通信时间轴（按 Rank 分行）</span>
        <div class="timeline-actions">
          <el-select
            v-model="selectedCommTypes"
            multiple
            collapse-tags
            collapse-tags-tooltip
            clearable
            filterable
            placeholder="按 comm_type 过滤"
            size="small"
            style="width: 320px"
          >
            <el-option
              v-for="item in commTypeOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
          <el-button
            size="small"
            :disabled="selectedCommId === null"
            @click="clearCommIdHighlight"
          >
            清除 comm_id 高亮
          </el-button>
          <el-button size="small" plain @click="toggleVisibilityEnhance">
            {{ visibilityEnhanced ? '关闭最小可见增强' : '开启最小可见增强' }}
          </el-button>
          <el-input-number v-model="maxPoints" :min="1000" :max="200000" :step="1000" size="small" />
          <el-button size="small" type="primary" :loading="loading" @click="loadData">刷新图表</el-button>
        </div>
      </div>
    </template>

    <div v-if="error" class="timeline-error">{{ error }}</div>
    <div v-else ref="chartRef" class="timeline-chart"></div>

    <div class="timeline-meta" v-if="meta">
      总事件 {{ meta.total_events }}，展示 {{ meta.returned_events }}，Rank 数 {{ meta.ranks?.length || 0 }}
      <span v-if="meta.time_offset_s != null" style="margin-left: 12px;">起始偏移 {{ Number(meta.time_offset_s).toFixed(6) }} s</span>
    </div>

    <div class="timeline-rank-summary" v-if="meta?.rank_event_counts?.length">
      <span class="summary-label">各 Rank 事件数：</span>
      <span
        v-for="item in meta.rank_event_counts"
        :key="item.rank"
        class="summary-chip"
      >
        R{{ item.rank }}: {{ item.count }}
      </span>
    </div>
  </el-card>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from "vue";
import * as echarts from "echarts";
import axios from "axios";

const props = defineProps({
  collectionId: {
    type: String,
    default: "",
  },
  visible: {
    type: Boolean,
    default: false,
  },
  activateKey: {
    type: Number,
    default: 0,
  },
});

const chartRef = ref(null);
let chart = null;
let resizeObserver = null;

const loading = ref(false);
const error = ref("");
const meta = ref(null);
const maxPoints = ref(12000);
const rawPayload = ref(null);
const selectedCommTypes = ref([]);
const commTypeOptions = ref([]);
const selectedCommId = ref(null);
const visibilityEnhanced = ref(false);

function colorFromType(commType) {
  const v = Number(commType) || 0;
  const hue = ((v * 37) % 360 + 360) % 360;
  return `hsl(${hue}, 70%, 55%)`;
}

function computeInitialWindow(rows, payload) {
  const timeMax = Number(payload?.time_max_s || 0);
  if (!rows.length || timeMax <= 0) {
    return null;
  }

  const bucketCount = Math.min(40, Math.max(10, Math.round(Math.sqrt(rows.length / 50))));
  const bucketWidth = Math.max(timeMax / bucketCount, 0.5);
  const buckets = new Array(Math.max(1, Math.ceil(timeMax / bucketWidth))).fill(0);
  for (const row of rows) {
    const index = Math.min(buckets.length - 1, Math.max(0, Math.floor(Number(row.start_s || 0) / bucketWidth)));
    buckets[index] += 1;
  }

  let bestIndex = 0;
  let bestCount = -1;
  buckets.forEach((count, index) => {
    if (count > bestCount) {
      bestCount = count;
      bestIndex = index;
    }
  });

  const startValue = Math.max(0, bestIndex * bucketWidth);
  const endValue = Math.min(timeMax, startValue + Math.max(bucketWidth * 2, Math.min(5, timeMax || 5)));
  return { startValue, endValue };
}

function minSegmentWidthFromDuration(commTimeUs) {
  const us = Math.max(0, Number(commTimeUs || 0));
  if (us <= 0) return 6;
  return Math.max(6, Math.min(18, 6 + Math.log10(us + 1) * 2.4));
}

function toggleVisibilityEnhance() {
  visibilityEnhanced.value = !visibilityEnhanced.value;
  renderCurrent();
}

function ensureChart() {
  if (!chartRef.value) return false;
  if (chart && chart.getDom && chart.getDom() !== chartRef.value) {
    chart.dispose();
    chart = null;
  }
  if (!chart) {
    if (!chartRef.value.clientWidth || !chartRef.value.clientHeight) return false;
    chart = echarts.init(chartRef.value);
    chart.on("click", (params) => {
      const commId = params?.data?.comm_id;
      if (commId === undefined || commId === null) return;
      selectedCommId.value = Number(commId);
      renderCurrent();
    });
  }
  return true;
}

function disposeChart() {
  if (chart) {
    chart.dispose();
    chart = null;
  }
}

function bindResizeObserver() {
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
  if (!chartRef.value || typeof ResizeObserver === "undefined") return;
  resizeObserver = new ResizeObserver(() => {
    if (chart) {
      chart.resize();
      return;
    }
    if (props.visible) {
      renderCurrent();
    }
  });
  resizeObserver.observe(chartRef.value);
}

async function waitForContainerReady(maxFrames = 20) {
  for (let i = 0; i < maxFrames; i += 1) {
    await nextTick();
    await new Promise((resolve) => requestAnimationFrame(resolve));
    if (chartRef.value?.clientWidth > 0 && chartRef.value?.clientHeight > 0) {
      bindResizeObserver();
      return true;
    }
  }
  return false;
}

function renderChart(payload) {
  if (!ensureChart()) return;
  if (!chart) return;

  const ranks = (payload.ranks || []).map((r) => String(r));
  const allRows = (payload.events || []).map((evt) => ({
    rank: String(evt.rank),
    start_s: Number(evt.start_s || 0),
    end_s: Number(evt.end_s || 0),
    comm_time_us: Number(evt.comm_time_us || 0),
    sendsize: evt.sendsize,
    sendcount: evt.sendcount,
    recvsize: evt.recvsize,
    recvcount: evt.recvcount,
    src: evt.src,
    dst: evt.dst,
    comm_type: evt.comm_type,
    comm_type_name: evt.comm_type_name,
    comm_id: evt.comm_id,
    comm_size: evt.comm_size,
    root: evt.root,
  }));

  const selectedSet = new Set((selectedCommTypes.value || []).map((v) => Number(v)));
  const rows = selectedSet.size > 0
    ? allRows.filter((row) => selectedSet.has(Number(row.comm_type)))
    : allRows;

  const timeMin = Number(payload.time_min_s ?? 0);
  const timeMax = Number(payload.time_max_s ?? 1);
  const timeRange = Math.max(1e-9, timeMax - timeMin);
  const plotWidth = Math.max(120, chart.getWidth() - 110);
  const segmentRows = rows.map((row) => {
    const durationPx = Math.max(1, ((row.end_s - row.start_s) / timeRange) * plotWidth);
    const visibleWidth = visibilityEnhanced.value
      ? Math.max(durationPx, minSegmentWidthFromDuration(row.comm_time_us))
      : durationPx;
    return {
      ...row,
      value: [((row.start_s + row.end_s) / 2), row.rank],
      segmentWidthPx: visibleWidth,
      segmentHeightPx: selectedCommId.value != null && Number(row.comm_id) === Number(selectedCommId.value) ? 4 : 3,
      itemStyle: {
        color: colorFromType(row.comm_type),
        opacity: selectedCommId.value == null || Number(row.comm_id) === Number(selectedCommId.value) ? 0.95 : 0.16,
      },
    };
  });

  if (!rows.length || !ranks.length) {
    chart.clear();
    chart.setOption({
      title: {
        text: "暂无可展示的通信事件",
        left: "center",
        top: "middle",
        textStyle: {
          color: "#909399",
          fontSize: 14,
          fontWeight: "normal",
        },
      },
    });
    return;
  }

  const option = {
    animation: false,
    grid: { left: 80, right: 30, top: 40, bottom: 60 },
    dataZoom: [
      { type: "inside", xAxisIndex: 0 },
      { type: "slider", xAxisIndex: 0, bottom: 20 },
      { type: "inside", yAxisIndex: 0 },
    ],
    xAxis: {
      type: "value",
      min: timeMin,
      max: timeMax,
      name: "time_stamp (s)",
      nameLocation: "middle",
      nameGap: 35,
      axisLabel: {
        formatter: (v) => Number(v).toFixed(3),
      },
    },
    yAxis: {
      type: "category",
      name: "Rank",
      data: ranks,
    },
    tooltip: {
      trigger: "item",
      confine: true,
      formatter: (params) => {
        const d = params.data || {};
        return [
          `<b>${d.comm_type_name || d.comm_type}</b>`,
          `comm_id: ${d.comm_id}`,
          `rank: ${d.rank}`,
          `time_stamp: ${Number(d.start_s).toFixed(6)} s`,
          `comm_time: ${Number(d.comm_time_us).toFixed(3)} us`,
          `sendsize/sendcount: ${d.sendsize}/${d.sendcount}`,
          `recvsize/recvcount: ${d.recvsize}/${d.recvcount}`,
          `src/dst: ${d.src}/${d.dst}`,
          `comm_type: ${d.comm_type}`,
        ].join("<br/>");
      },
    },
    series: [
      {
        type: "scatter",
        name: "visible-segments",
        symbol: "rect",
        data: segmentRows,
        z: 4,
        symbolSize: (value, params) => [params?.data?.segmentWidthPx || 6, params?.data?.segmentHeightPx || 3],
      },
    ],
  };

  chart.setOption(option, true);
  chart.resize();
}

function buildCommTypeOptions(events) {
  const map = new Map();
  for (const evt of events || []) {
    const type = Number(evt.comm_type);
    if (!map.has(type)) {
      map.set(type, evt.comm_type_name || `TYPE_${type}`);
    }
  }
  return [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([value, name]) => ({ value, label: `${value} - ${name}` }));
}

function renderCurrent() {
  if (!rawPayload.value) return;
  renderChart(rawPayload.value);
}

function clearCommIdHighlight() {
  selectedCommId.value = null;
  renderCurrent();
}

async function loadData() {
  if (!props.collectionId || !props.visible) return;
  loading.value = true;
  error.value = "";
  try {
    const ready = await waitForContainerReady();
    if (!ready) {
      throw new Error("图表容器尚未完成布局，请稍后重试");
    }

    const resp = await axios.get(`/api/mt3000/comm/collections/${props.collectionId}/timeline`, {
      params: { max_points: maxPoints.value },
    });
    if (resp.data?.status !== "success") throw new Error(resp.data?.message || "加载失败");
    rawPayload.value = resp.data.data;
    commTypeOptions.value = buildCommTypeOptions(resp.data.data?.events || []);
    meta.value = {
      ...resp.data.data,
      returned_events: (resp.data.data?.events || []).length,
    };
    await nextTick();
    renderCurrent();
  } catch (e) {
    rawPayload.value = null;
    meta.value = null;
    error.value = e?.response?.data?.message || e?.response?.data?.detail || e?.message || "加载失败";
    if (chart) {
      chart.clear();
    }
  } finally {
    loading.value = false;
  }
}

function onResize() {
  if (chart) {
    chart.resize();
    return;
  }
  if (props.visible) {
    renderCurrent();
  }
}

watch(
  () => [props.collectionId, props.visible, props.activateKey],
  async ([id, visible]) => {
    if (!id || !visible) return;
    await loadData();
  },
  { immediate: true }
);

watch(selectedCommTypes, () => {
  renderCurrent();
});

watch(chartRef, async () => {
  await nextTick();
  bindResizeObserver();
});

onMounted(() => {
  window.addEventListener("resize", onResize);
  bindResizeObserver();
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", onResize);
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
  disposeChart();
});
</script>

<style scoped>
.timeline-card {
  margin-top: 12px;
}
.timeline-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.timeline-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}
.timeline-chart {
  width: 100%;
  height: 460px;
}
.timeline-error {
  color: #f56c6c;
  padding: 8px 0;
}
.timeline-meta {
  margin-top: 8px;
  color: #666;
  font-size: 12px;
}
.timeline-rank-summary {
  margin-top: 8px;
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  align-items: center;
  color: #666;
  font-size: 12px;
}
.summary-label {
  color: #909399;
}
.summary-chip {
  padding: 2px 6px;
  border-radius: 10px;
  background: #f4f4f5;
}
</style>
