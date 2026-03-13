<template>
  <el-tabs type="border-card">
    <el-tab-pane label="新建采集">
      <CommCollectionForm />
    </el-tab-pane>
    <el-tab-pane label="采集任务">
      <CommCollectionTasks />
    </el-tab-pane>
  </el-tabs>
</template>

<script setup>
import CommCollectionForm from "@/components/COMM/CommCollectionForm.vue";
import CommCollectionTasks from "@/components/COMM/CommCollectionTasks.vue";
</script>
