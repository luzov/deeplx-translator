<template>
    <div class="translator">
        <div class="language-selector">
            <el-select v-model="sourceLang" placeholder="源语言">
                <el-option v-for="lang in languages" :key="lang.value" :label="lang.label" :value="lang.value" />
            </el-select>
            <el-button @click="swapLanguages" circle class="swap-button">
                <el-icon>
                    <Refresh />
                </el-icon>
            </el-button>
            <el-select v-model="targetLang" placeholder="目标语言">
                <el-option v-for="lang in languages" :key="lang.value" :label="lang.label" :value="lang.value" />
            </el-select>
        </div>

        <div class="translation-area">
            <el-input v-model="sourceText" type="textarea" :rows="6" placeholder="请输入要翻译的文本"
                class="translation-input" />

            <div class="translation-result">
                <el-input v-model="translationResult" type="textarea" :rows="6" placeholder="翻译结果" readonly
                    class="translation-input" />
                <span class="method-label">{{ translationMethod }}</span>
            </div>
        </div>
        <div class="button-container">
            <el-button class="translate-button" type="primary" @click="translate"
                :loading="isTranslating">翻译</el-button>
            <el-button class="clear-button" type="danger" @click="clearAll">清空</el-button>
        </div>
        <el-input v-if="alternativeTranslations.length > 0" v-model="alternativeTranslationsText" type="textarea"
            :rows="4" placeholder="替代翻译" readonly />

        <el-button class="settings-button" circle @click="showSettings">
            <el-icon>
                <Setting />
            </el-icon>
        </el-button>

        <el-dialog title="API 设置" v-model="settingsVisible">
            <el-form>
                <el-form-item label="API 地址">
                    <el-input v-model="newApiUrl" placeholder="输入新的 API 地址" />
                </el-form-item>
            </el-form>
            <el-button type="primary" @click="addApiUrl">添加 API 地址</el-button>
            <el-table :data="apiUrls">
                <el-table-column prop="url" label="API 地址" />
                <el-table-column>
                    <template #default="scope">
                        <el-button type="danger" @click="removeApiUrl(scope.$index)">删除</el-button>
                    </template>
                </el-table-column>
            </el-table>
        </el-dialog>
    </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';
import { ElMessage } from 'element-plus';
import { Refresh, Setting } from '@element-plus/icons-vue';

const sourceText = ref('');
const translationResult = ref('');
const alternativeTranslations = ref<string[]>([]);
const alternativeTranslationsText = ref('');
const translationMethod = ref('');
const isTranslating = ref(false);
const settingsVisible = ref(false);
const newApiUrl = ref('');
const apiUrls = ref<{ url: string }[]>([]);
const sourceLang = ref('AUTO');
const targetLang = ref('ZH');

const languages = [
    { value: 'AUTO', label: '自动检测' },
    { value: 'ZH', label: '中文' },
    { value: 'EN', label: '英语' },
    { value: 'JA', label: '日语' },
    { value: 'KO', label: '韩语' },
    { value: 'FR', label: '法语' },
    { value: 'DE', label: '德语' },
    { value: 'ES', label: '西班牙语' },
    { value: 'RU', label: '俄语' },
];

onMounted(() => {
    const savedApiUrls = localStorage.getItem('apiUrls');
    if (savedApiUrls) {
        apiUrls.value = JSON.parse(savedApiUrls);
    }
});

const translate = async () => {
    if (!sourceText.value) {
        ElMessage.warning('请输入要翻译的文本');
        return;
    }

    if (apiUrls.value.length === 0) {
        ElMessage.error('请先添加 API 地址');
        return;
    }

    isTranslating.value = true;
    let success = false;

    for (const apiUrl of apiUrls.value) {
        try {
            const response = await axios.post(apiUrl.url, {
                text: sourceText.value,
                source_lang: sourceLang.value,
                target_lang: targetLang.value,
            });

            translationResult.value = response.data.data;
            alternativeTranslations.value = response.data.alternatives || [];
            alternativeTranslationsText.value =
                alternativeTranslations.value.join('\n');
            translationMethod.value = response.data.method;
            success = true;
            break;
        } catch (error) {
            console.error('Translation failed:', error);
        }
    }

    if (!success) {
        ElMessage.error('翻译失败，请检查 API 地址或网络连接');
    }

    isTranslating.value = false;
};

const showSettings = () => {
    settingsVisible.value = true;
};

const addApiUrl = async () => {
    if (!newApiUrl.value) {
        ElMessage.warning('请输入 API 地址');
        return;
    }

    try {
        const response = await axios.post(newApiUrl.value, {
            text: 'hello',
            source_lang: 'EN',
            target_lang: 'ZH',
        });

        if (response.data && response.data.data) {
            apiUrls.value.push({ url: newApiUrl.value });
            localStorage.setItem('apiUrls', JSON.stringify(apiUrls.value));
            newApiUrl.value = '';
            ElMessage.success('API 地址添加成功');
        } else {
            ElMessage.error('API 地址无效');
        }
    } catch (error) {
        ElMessage.error('API 地址无效');
    }
};

const removeApiUrl = (index: number) => {
    apiUrls.value.splice(index, 1);
    localStorage.setItem('apiUrls', JSON.stringify(apiUrls.value));
};

const swapLanguages = () => {
    if (sourceLang.value !== 'AUTO' && targetLang.value !== 'AUTO') {
        [sourceLang.value, targetLang.value] = [targetLang.value, sourceLang.value];
    }
};

const clearAll = () => {
    sourceText.value = '';
    translationResult.value = '';
    alternativeTranslations.value = [];
    alternativeTranslationsText.value = '';
};
</script>

<style scoped>
.translator {
    display: flex;
    flex-direction: column;
    gap: 20px;
    position: relative;
    padding-bottom: 60px;
}

.language-selector {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
}

.swap-button {
    margin: 0 10px;
    /* 调整交换按钮的间距 */
}

.translation-area {
    display: flex;
    gap: 20px;
}

.translation-input {
    flex: 1;
}

.translation-result {
    position: relative;
    flex: 1;
}

.method-label {
    position: absolute;
    top: 5px;
    right: 10px;
    font-size: 12px;
    color: #909399;
}

.button-container {
  display: flex;
  justify-content: space-between;
  margin-top: 10px; /* 调整按钮容器与上方元素的间距 */
}

.translate-button {
  flex: 1; /* 占据剩余空间 */
}

.clear-button {
  margin-left: 10px; /* 调整清空按钮与翻译按钮的间距 */
}

.settings-button {
  position: fixed;
  bottom: 20px;
  right: 20px;
}
</style>