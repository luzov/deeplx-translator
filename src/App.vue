<template>
  <div class="container">
    <h1>DeepLX 翻译</h1>
    <TranslatorComponent />
  </div>
</template>

<script lang="ts" setup>
import TranslatorComponent from './components/TranslatorComponent.vue';
</script>

<style>
body {
  font-family: "LXGW WenKai", sans-serif;
  background-color: #f0f2f5;
  margin: 0;
  padding: 0;
}

.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

h1 {
  text-align: center;
  color: #409EFF;
}
</style>