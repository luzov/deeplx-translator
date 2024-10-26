<template>
    <div class="translator">
        <div class="language-selector">
            <el-select v-model="sourceLang" placeholder="选择源语言">
                <el-option v-for="lang in enabledSourceLangs" :key="lang.value" :label="lang.label"
                    :value="lang.value" />
            </el-select>
            <el-button @click="swapLanguages" circle class="swap-button">
                <el-icon>
                    <Refresh />
                </el-icon>
            </el-button>
            <el-select v-model="targetLang" placeholder="选择目标语言">
                <el-option v-for="lang in enabledTargetLangs" :key="lang.value" :label="lang.label"
                    :value="lang.value" />
            </el-select>
        </div>

        <div class="translation-area">
            <el-input v-model="sourceText" type="textarea" :rows="12" placeholder="请输入要翻译的文本"
                class="translation-input" />

            <div class="translation-result">
                <div class="labels-container">
                    <el-tag v-if="showTranslationTime && translationTime" type="info" class="time-label" size="small">
                        {{ translationTime }}ms
                    </el-tag>
                    <el-tag v-if="showMethodLabel && translationMethod" :type="tagType" class="method-label"
                        size="small">
                        {{ translationMethod }}
                    </el-tag>
                </div>
                <el-input v-model="translationResult" type="textarea" :rows="12" placeholder="翻译结果" readonly
                    class="translation-input" />
            </div>
        </div>
        <div class="button-container">
            <div class="left-buttons">
                <el-button class="translate-button" type="primary" plain @click="translate"
                    :loading="isTranslating">翻译</el-button>
            </div>
            <div class="right-buttons">
                <el-button class="copy-button" type="success" plain @click="copyResult"
                    :disabled="!translationResult">复制</el-button>
                <el-button class="clear-button" type="danger" plain @click="clearAll"
                    :disabled="!hasContent">清空</el-button>
            </div>
        </div>
        <div class="alternative-translations" v-if="alternativeTranslations.length > 0">
            <div class="alternative-input-container">
                <el-input v-model="alternativeTranslationsText" type="textarea" :rows="4" placeholder="替代翻译" readonly />
                <el-button class="alternative-copy-button" type="success" plain circle size="small"
                    @click="copyAlternativeResult" :disabled="!alternativeTranslationsText">
                    <el-icon>
                        <Document />
                    </el-icon>
                </el-button>
            </div>
        </div>

        <el-button class="settings-button" circle @click="showSettings">
            <el-icon>
                <Setting />
            </el-icon>
        </el-button>

        <el-dialog title="设置" v-model="settingsVisible" width="800px" class="settings-dialog">
            <el-tabs>
                <el-tab-pane label="通用设置">
                    <el-form>
                        <el-form-item label="显示Method标签">
                            <el-switch v-model="showMethodLabel" />
                        </el-form-item>
                        <el-form-item label="显示翻译用时">
                            <el-switch v-model="showTranslationTime" />
                        </el-form-item>
                        <!-- 添加自动切换语言设置 -->
                        <el-form-item label="检测到中文时切换目标语言为">
                            <el-select v-model="autoTargetLangForChinese" placeholder="选择目标语言" class="settings-select">
                                <el-option v-for="lang in enabledTargetLangs.filter(l => l.value !== 'ZH')"
                                    :key="lang.value" :label="lang.label" :value="lang.value" />
                            </el-select>
                        </el-form-item>

                        <el-form-item label="检测到英文时切换目标语言为">
                            <el-select v-model="autoTargetLangForEnglish" placeholder="选择目标语言" class="settings-select">
                                <el-option
                                    v-for="lang in enabledTargetLangs.filter(l => !['EN', 'EN-GB', 'EN-US'].includes(l.value))"
                                    :key="lang.value" :label="lang.label" :value="lang.value" />
                            </el-select>
                        </el-form-item>
                        <!-- 添加导入导出按钮 -->
                        <div class="settings-actions">
                            <el-button type="primary" plain @click="exportSettings">导出配置</el-button>
                            <el-upload class="settings-upload" action="" :auto-upload="false" :show-file-list="false"
                                accept=".json" @change="importSettings">
                                <el-button type="primary" plain>导入配置</el-button>
                            </el-upload>
                        </div>
                        <el-divider />
                        <!-- 现有的清除配置按钮 -->
                        <el-form-item>
                            <el-popconfirm title="确定要清除所有本地配置吗？此操作不可逆。" @confirm="clearAllLocalSettings"
                                confirm-button-text="确定" cancel-button-text="取消">
                                <template #reference>
                                    <el-button type="danger">清除所有本地配置</el-button>
                                </template>
                            </el-popconfirm>
                        </el-form-item>
                    </el-form>
                </el-tab-pane>
                <el-tab-pane label="API 设置">
                    <div class="api-header">
                        <el-form :inline="true" class="api-form">
                            <el-form-item label="API 地址" class="api-input">
                                <el-input v-model="newApiUrl" placeholder="输入新的 API 地址" />
                            </el-form-item>
                            <el-form-item>
                                <el-button type="primary" @click="addApiUrl" :loading="isCheckingApi">添加</el-button>
                            </el-form-item>
                        </el-form>
                        <div class="api-actions">
                            <el-button type="primary" @click="checkAllApiAvailability" :loading="isCheckingAllApis"
                                size="small">
                                检查可用性
                            </el-button>
                            <el-popconfirm title="确定要删除所有不可用的API吗？" @confirm="removeUnavailableApis"
                                confirm-button-text="确定" cancel-button-text="取消">
                                <template #reference>
                                    <el-button type="danger" size="small" :disabled="!hasUnavailableApis">
                                        删除不可用
                                    </el-button>
                                </template>
                            </el-popconfirm>
                        </div>
                    </div>
                    <el-table :data="apiUrls" style="width: 100%">
                        <el-table-column prop="url" label="API 地址" min-width="200" />
                        <el-table-column prop="method" label="翻译引擎" width="100" />
                        <el-table-column label="状态" width="80">
                            <template #default="scope">
                                <el-tag :type="scope.row.available ? 'success' : 'danger'" size="small">
                                    {{ scope.row.available ? '可用' : '不可用' }}
                                </el-tag>
                            </template>
                        </el-table-column>
                        <el-table-column label="使用统计" width="200">
                            <template #default="scope">
                                <div class="api-stats">
                                    <div>总次数: {{ scope.row.useCount || 0 }}</div>
                                    <div>成功率: {{ calculateSuccessRate(scope.row) }}%</div>
                                    <div v-if="scope.row.lastUsed">
                                        最后使用: {{ formatLastUsed(scope.row.lastUsed) }}
                                    </div>
                                </div>
                            </template>
                        </el-table-column>
                        <el-table-column label="操作" width="120">
                            <template #default="scope">
                                <el-button type="danger" size="small" @click="removeApiUrl(scope.$index)">
                                    删除
                                </el-button>
                            </template>
                        </el-table-column>
                    </el-table>
                </el-tab-pane>
                <el-tab-pane label="源语言设置">
                    <el-button @click="resetSourceLanguages">重置源语言设置</el-button>
                    <el-table :data="sourceLangs" row-key="value" height="400" style="width: 100%">
                        <el-table-column prop="label" label="语言" />
                        <el-table-column prop="value" label="代码" width="100" />
                        <el-table-column label="启用" width="100">
                            <template #default="scope">
                                <el-switch v-model="scope.row.enabled" @change="saveLanguageSettings" />
                            </template>
                        </el-table-column>
                    </el-table>
                </el-tab-pane>
                <el-tab-pane label="目标语言设置">
                    <el-button @click="resetTargetLanguages">重置目标语言设置</el-button>
                    <el-table :data="targetLangs" row-key="value" height="400" style="width: 100%">
                        <el-table-column prop="label" label="语言" />
                        <el-table-column prop="value" label="代码" width="100" />
                        <el-table-column label="启用" width="100">
                            <template #default="scope">
                                <el-switch v-model="scope.row.enabled" @change="saveLanguageSettings" />
                            </template>
                        </el-table-column>
                    </el-table>
                </el-tab-pane>
            </el-tabs>
        </el-dialog>

        <!-- 添加作者信息 -->
        <div class="footer">
            <span>Powered by Cursor | Created by <a href="https://github.com/luzov" target="_blank">luzov</a></span>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { ref, watch, computed, onMounted, h, reactive } from 'vue';
import axios from 'axios';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Refresh, Setting, Document } from '@element-plus/icons-vue';

const sourceText = ref('');
const translationResult = ref('');
const alternativeTranslations = ref<string[]>([]);
const alternativeTranslationsText = ref('');
const translationMethod = ref('');
const isTranslating = ref(false);
const settingsVisible = ref(false);
const newApiUrl = ref('');
const apiUrls = ref<{ url: string; method: string; available: boolean; useCount: number; lastUsed: number; successCount: number; failureCount: number }[]>([]);
const sourceLang = ref('AUTO');
const targetLang = ref('ZH');
const showMethodLabel = ref(true);
const isCheckingApi = ref(false);
const isCheckingAllApis = ref(false);
const showTranslationTime = ref(true);
const translationTime = ref(0);
const autoTargetLangForChinese = ref('EN');  // 检测到中文时的默认目标语言
const autoTargetLangForEnglish = ref('ZH');  // 检测到英文时的默认目标语言

interface Language {
    value: string;
    label: string;
    enabled: boolean;
}

const sourceLangs = ref<Language[]>([
    { value: 'AUTO', label: '自动检测', enabled: true },
    { value: 'ZH', label: '中文', enabled: true },
    { value: 'EN', label: '英语', enabled: true },
    { value: 'JA', label: '日语', enabled: true },
    { value: 'KO', label: '韩语', enabled: true },
    { value: 'FR', label: '法语', enabled: true },
    { value: 'DE', label: '德语', enabled: true },
    { value: 'ES', label: '西班牙语', enabled: true },
    { value: 'IT', label: '意大利语', enabled: true },
    { value: 'RU', label: '俄语', enabled: true },
    { value: 'BG', label: '保加利亚语', enabled: false },
    { value: 'CS', label: '捷克语', enabled: false },
    { value: 'DA', label: '丹麦语', enabled: false },
    { value: 'EL', label: '希腊语', enabled: false },
    { value: 'ET', label: '爱沙尼亚语', enabled: false },
    { value: 'FI', label: '芬兰语', enabled: false },
    { value: 'HU', label: '匈牙利语', enabled: false },
    { value: 'ID', label: '印度尼西亚语', enabled: false },
    { value: 'LT', label: '立陶宛语', enabled: false },
    { value: 'LV', label: '拉脱维亚语', enabled: false },
    { value: 'NB', label: '挪威语（Bokmål）', enabled: false },
    { value: 'NL', label: '荷兰语', enabled: false },
    { value: 'PL', label: '波兰语', enabled: false },
    { value: 'PT', label: '葡萄牙语', enabled: false },
    { value: 'RO', label: '罗马尼亚语', enabled: false },
    { value: 'SK', label: '斯洛伐克语', enabled: false },
    { value: 'SL', label: '斯洛文尼亚语', enabled: false },
    { value: 'SV', label: '瑞典语', enabled: false },
    { value: 'TR', label: '土耳其语', enabled: false },
    { value: 'UK', label: '乌克兰语', enabled: false },
]);

const targetLangs = ref<Language[]>([
    { value: 'ZH', label: '中文', enabled: true },
    { value: 'EN', label: '英语', enabled: true },
    { value: 'EN-US', label: '英语（美国）', enabled: true },
    { value: 'EN-GB', label: '英语（英国）', enabled: true },
    { value: 'JA', label: '日语', enabled: true },
    { value: 'KO', label: '韩语', enabled: true },
    { value: 'FR', label: '法语', enabled: true },
    { value: 'DE', label: '德语', enabled: true },
    { value: 'ES', label: '西班牙语', enabled: true },
    { value: 'IT', label: '意大利语', enabled: true },
    { value: 'RU', label: '俄语', enabled: true },
    { value: 'AR', label: '阿拉伯语', enabled: false },
    { value: 'BG', label: '保加利亚语', enabled: false },
    { value: 'CS', label: '捷克语', enabled: false },
    { value: 'DA', label: '丹麦语', enabled: false },
    { value: 'EL', label: '希腊语', enabled: false },
    { value: 'ET', label: '爱沙尼亚语', enabled: false },
    { value: 'FI', label: '芬兰语', enabled: false },
    { value: 'HU', label: '匈牙利语', enabled: false },
    { value: 'ID', label: '印度尼西亚语', enabled: false },
    { value: 'LT', label: '立陶宛语', enabled: false },
    { value: 'LV', label: '拉脱维亚语', enabled: false },
    { value: 'NB', label: '挪威语（Bokmål）', enabled: false },
    { value: 'NL', label: '荷兰语', enabled: false },
    { value: 'PL', label: '波兰语', enabled: false },
    { value: 'PT-BR', label: '葡萄牙语（巴西）', enabled: false },
    { value: 'PT-PT', label: '葡萄牙语（葡萄牙）', enabled: false },
    { value: 'RO', label: '罗马尼亚语', enabled: false },
    { value: 'SK', label: '斯洛伐克语', enabled: false },
    { value: 'SL', label: '斯洛文尼亚语', enabled: false },
    { value: 'SV', label: '瑞典语', enabled: false },
    { value: 'TR', label: '土耳其语', enabled: false },
    { value: 'UK', label: '乌克兰语', enabled: false },
    { value: 'ZH-HANS', label: '中文（简体）', enabled: false },
    { value: 'ZH-HANT', label: '中文（繁体）', enabled: false },
]);

const enabledSourceLangs = computed(() => sourceLangs.value.filter(lang => lang.enabled));
const enabledTargetLangs = computed(() => targetLangs.value.filter(lang => lang.enabled));




// 修改格式化API URL的辅助函数
const formatProxyUrl = (originalUrl: string) => {
    try {
        // 检查是否是IP地址（可能带端口）的格式
        const ipRegex = /^(https?:\/\/)((?:\d{1,3}\.){3}\d{1,3})(:\d+)?(\/.*)$/;
        const ipMatch = originalUrl.match(ipRegex);

        if (ipMatch) {
            // 如果是IP地址格式，直接返回原始URL
            return originalUrl;
        }

        // 其他情况走代理
        let protocol = 'http';
        let urlWithoutProtocol = originalUrl;

        // 检查并提取协议
        const protocolMatch = originalUrl.match(/^(https?):\/\//);
        if (protocolMatch) {
            protocol = protocolMatch[1];
            urlWithoutProtocol = originalUrl.replace(/^https?:\/\//, '');
        }

        // 移除末尾的斜杠
        urlWithoutProtocol = urlWithoutProtocol.replace(/\/$/, '');

        // 确保路径正确
        if (!urlWithoutProtocol.includes('/')) {
            urlWithoutProtocol += '/';
        }

        // 返回格式化后的URL，包含协议信息
        return `/api/${protocol}/${urlWithoutProtocol}`;
    } catch (error) {
        console.error('URL格式化错误:', error);
        return originalUrl;
    }
};

// 修改API请求函数，添加重试逻辑
const makeApiRequest = async (url: string, data: any, retries = 1): Promise<any> => {
    try {
        const proxyUrl = formatProxyUrl(url);
        const response = await axios.post(proxyUrl, data, {
            timeout: 10000, // 10秒超时
            headers: {
                'Content-Type': 'application/json',
            }
        });
        return response;
    } catch (error: any) {
        if (retries > 0 && error.response?.status === 502) {
            // 如果是502错误且还有重试次数，等待后重试
            await new Promise(resolve => setTimeout(resolve, 1000));
            return makeApiRequest(url, data, retries - 1);
        }
        throw error;
    }
};

// 添加 API 使用计数接口
interface ApiUrlInfo {
    url: string;
    method: string;
    available: boolean;
    useCount: number;      // API 使用次数
    lastUsed: number;      // 最后使用时间
    successCount: number;  // 成功次数
    failureCount: number;  // 失败次数
}

// 修改翻译函数
const translate = async () => {
    isTranslating.value = true;
    const startTime = Date.now();

    if (apiUrls.value.length === 0) {
        ElMessage.error('没有可供翻译的API，请在右下角设置中添加API');
        isTranslating.value = false;
        return;
    }

    // 创建可用API的副本并按使用次数排序
    const availableApis = [...apiUrls.value]
        .filter(api => api.available)
        .sort((a, b) => {
            // 优先选择使用次数少的API
            const countA = a.useCount || 0;
            const countB = b.useCount || 0;
            if (countA !== countB) return countA - countB;

            // 使用次数相同时，选择最后使用时间更早的
            const timeA = a.lastUsed || 0;
            const timeB = b.lastUsed || 0;
            return timeA - timeB;
        });

    if (availableApis.length === 0) {
        ElMessage.error('没有可用的API，请检查API设置');
        isTranslating.value = false;
        return;
    }

    // 随机选择前3个API中的一个（如果不足3个则在现有范围内随机）
    const randomIndex = Math.floor(Math.random() * Math.min(3, availableApis.length));
    const selectedApi = availableApis[randomIndex];

    try {
        const response = await makeApiRequest(selectedApi.url, {
            text: sourceText.value,
            source_lang: sourceLang.value,
            target_lang: targetLang.value,
        });

        if (response.data && response.data.data) {
            updateApiStats(selectedApi.url, true);
            // 更新API使用统计
            const apiIndex = apiUrls.value.findIndex(api => api.url === selectedApi.url);
            if (apiIndex !== -1) {
                apiUrls.value[apiIndex].useCount = (apiUrls.value[apiIndex].useCount || 0) + 1;
                apiUrls.value[apiIndex].lastUsed = Date.now();
                localStorage.setItem('apiUrls', JSON.stringify(apiUrls.value));
            }

            translationResult.value = response.data.data;
            alternativeTranslations.value = response.data.alternatives || [];
            alternativeTranslationsText.value = alternativeTranslations.value.join('\n');
            translationMethod.value = response.data.method;
        }
    } catch (error: any) {
        updateApiStats(selectedApi.url, false);
        console.error('Translation failed:', error.message);

        // 标记API为不可用
        const apiIndex = apiUrls.value.findIndex(api => api.url === selectedApi.url);
        if (apiIndex !== -1) {
            apiUrls.value[apiIndex].available = false;
            localStorage.setItem('apiUrls', JSON.stringify(apiUrls.value));
        }

        ElMessage.error(
            error.response?.status === 502 ?
                'API服务器连接失败，请检查API地址是否正确' :
                '翻译失败，请检查API地址或网络连接'
        );
    }

    translationTime.value = Date.now() - startTime;
    isTranslating.value = false;
};


// 添加防抖函数
const debounce = (fn: Function, delay: number) => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    return function (this: any, ...args: any[]) {
        if (timeoutId !== null) {
            clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(() => fn.apply(this, args), delay);
    };
};

// 添加检测中文的函数
const containsChinese = (text: string): boolean => {
    return /[\u4e00-\u9fa5]/.test(text);
};

// 添加检测英语的函数
const containsEnglish = (text: string): boolean => {
    return /[a-zA-Z]/.test(text);
};

// 监听目标语言变化
watch(targetLang, () => {
    if (sourceText.value.trim() && !isTranslating.value) {
        translate();
    }
});


watch(sourceText, debounce(() => {
    const text = sourceText.value.trim();

    if (!text) {
        translationResult.value = '';
        alternativeTranslations.value = [];
        alternativeTranslationsText.value = '';
        translationMethod.value = '';
        return;
    }

    // 检测中文并自动切换目标语言
    if (containsChinese(text) && targetLang.value === 'ZH') {
        sourceLang.value = 'AUTO';
        targetLang.value = autoTargetLangForChinese.value;
        ElMessage.success('检测到中文输入，已自动切换目标语言');
        return;
    }

    // 检测英语并自动切换目标语言
    if (containsEnglish(text) && ['EN', 'EN-GB', 'EN-US'].includes(targetLang.value)) {
        sourceLang.value = 'AUTO';
        targetLang.value = autoTargetLangForEnglish.value;
        ElMessage.success('检测到英语输入，已自动切换目标语言');
        return;
    }

    if (!isTranslating.value) {
        translate();
    }
}, 500));

const showSettings = () => {
    settingsVisible.value = true;
};

// 添加API函数
const addApiUrl = async () => {
    if (!newApiUrl.value) {
        ElMessage.warning('请输入 API 地址');
        return;
    }

    // 去除api前后空格
    newApiUrl.value = newApiUrl.value.trim();

    isCheckingApi.value = true;
    try {
        const response = await makeApiRequest(newApiUrl.value, {
            text: 'hello',
            source_lang: 'EN',
            target_lang: 'ZH',
        });

        if (response.data && response.data.data) {
            apiUrls.value.push({
                url: newApiUrl.value,
                method: response.data.method || 'Unknown',
                available: true,
                useCount: 0,
                lastUsed: 0,
                successCount: 0,
                failureCount: 0
            });
            localStorage.setItem('apiUrls', JSON.stringify(apiUrls.value));
            newApiUrl.value = '';
            ElMessage.success('API 地址添加成功');
        } else {
            ElMessage.error('API 地址无效');
        }
    } catch (error) {
        console.error('API添加失败:', error);
        ElMessage.error('API 地址无效');
    } finally {
        isCheckingApi.value = false;
    }
};

const removeApiUrl = (index: number) => {
    apiUrls.value.splice(index, 1);
    localStorage.setItem('apiUrls', JSON.stringify(apiUrls.value));
};

const swapLanguages = () => {
    if (sourceLang.value === 'AUTO' || targetLang.value === 'AUTO') {
        ElMessage.warning('自动检测不能交换哦！');
        return;
    }
    [sourceLang.value, targetLang.value] = [targetLang.value, sourceLang.value];
};

const clearAll = () => {
    sourceText.value = '';
    translationResult.value = '';
    alternativeTranslations.value = [];
    alternativeTranslationsText.value = '';
};

// 监听 showMethodLabel 的变化并保存到 localStorage
watch(showMethodLabel, (newValue) => {
    localStorage.setItem('showMethodLabel', JSON.stringify(newValue));
});

// 监听 showTranslationTime 的变化并保存到 localStorage
watch(showTranslationTime, (newValue) => {
    localStorage.setItem('showTranslationTime', JSON.stringify(newValue));
});

// 监听设置变化并保存
watch([autoTargetLangForChinese, autoTargetLangForEnglish], ([newChinese, newEnglish]) => {
    localStorage.setItem('autoTargetLangForChinese', newChinese);
    localStorage.setItem('autoTargetLangForEnglish', newEnglish);
});

// 在组件挂载时从 localStorage 读取 showMethodLabel 和 apiUrls 的值
onMounted(() => {
    const savedApiUrls = localStorage.getItem('apiUrls');
    if (savedApiUrls !== null) {
        apiUrls.value = JSON.parse(savedApiUrls);
    }

    const savedShowMethodLabel = localStorage.getItem('showMethodLabel');
    if (savedShowMethodLabel !== null) {
        showMethodLabel.value = JSON.parse(savedShowMethodLabel);
    }

    const savedShowTranslationTime = localStorage.getItem('showTranslationTime');
    if (savedShowTranslationTime !== null) {
        showTranslationTime.value = JSON.parse(savedShowTranslationTime);
    }

    const savedAutoTargetLangForChinese = localStorage.getItem('autoTargetLangForChinese');
    if (savedAutoTargetLangForChinese) {
        autoTargetLangForChinese.value = savedAutoTargetLangForChinese;
    }

    const savedAutoTargetLangForEnglish = localStorage.getItem('autoTargetLangForEnglish');
    if (savedAutoTargetLangForEnglish) {
        autoTargetLangForEnglish.value = savedAutoTargetLangForEnglish;
    }

    loadLanguageSettings();
});

// 添加计算属性来决定标签的类型
const tagType = computed(() => {
    if (translationMethod.value === 'Pro') {
        return 'success';
    } else if (translationMethod.value === 'Free') {
        return 'primary';
    }
    return '';
});

const saveLanguageSettings = () => {
    localStorage.setItem('sourceLangs', JSON.stringify(sourceLangs.value));
    localStorage.setItem('targetLangs', JSON.stringify(targetLangs.value));
};

const loadLanguageSettings = () => {
    const savedSourceLangs = localStorage.getItem('sourceLangs');
    const savedTargetLangs = localStorage.getItem('targetLangs');

    if (savedSourceLangs) {
        sourceLangs.value = JSON.parse(savedSourceLangs);
    }
    if (savedTargetLangs) {
        targetLangs.value = JSON.parse(savedTargetLangs);
    }
};

// 分别重置源语言和目标语言
const resetSourceLanguages = () => {
    // 清除源语言的本地存储
    localStorage.removeItem('sourceLangs');

    // 显示成功消息并刷新页面
    ElMessage.success('源语言已重置为默认设置');
    setTimeout(() => window.location.reload(), 1000);
};

const resetTargetLanguages = () => {
    // 先清除目标语言的本地存储
    localStorage.removeItem('targetLangs');

    // 显示成功消息并刷新页面
    ElMessage.success('目标语言已重置为默认设置');
    setTimeout(() => window.location.reload(), 1000);
};

const clearAllLocalSettings = () => {
    // 清除所有本地存储的配置
    localStorage.removeItem('showMethodLabel');
    localStorage.removeItem('apiUrls');
    localStorage.removeItem('sourceLangs');
    localStorage.removeItem('targetLangs');

    // 重置所有相关的响应式变量
    showMethodLabel.value = false;
    apiUrls.value = [];
    sourceLangs.value = sourceLangs.value.map(lang => ({ ...lang, enabled: false }));
    targetLangs.value = targetLangs.value.map(lang => ({ ...lang, enabled: false }));

    // 重置默认语言
    resetSourceLanguages();
    resetTargetLanguages();

    const state = reactive({
        countdown: 5
    });

    ElMessageBox({
        title: '清除配置',
        message: () => h('div', { style: 'text-align: center' }, [
            h('p', { style: 'font-size: 16px; margin-bottom: 15px' }, '所有本地配置已清除'),
            h('p', { style: 'color: #67c23a; font-size: 14px' }, `页面将在 ${state.countdown} 秒后自动刷新`)
        ]),
        type: 'success',
        showClose: false,
        closeOnClickModal: false,
        closeOnPressEscape: false,
        center: true,
        confirmButtonText: '立即刷新',
        customClass: 'settings-clear-dialog',
        draggable: false,
        lockScroll: true,
        showCancelButton: false,
        buttonSize: 'default'
    }).then(() => {
        window.location.reload();
    })

    // 创建倒计时定时器
    const timer = setInterval(() => {
        state.countdown--;
        if (state.countdown <= 0) {
            clearInterval(timer);
            window.location.reload();
        }
    }, 1000);
};

// 检查单个API可用性的函数
// const checkApiAvailability = async (apiUrl: string): Promise<boolean> => {
//     try {
//         const response = await makeApiRequest(apiUrl, {
//             text: 'hello',
//             source_lang: 'EN',
//             target_lang: 'ZH',
//         });
//         return !!(response.data && response.data.data);
//     } catch (error) {
//         console.error('API可用性检查失败:', error);
//         return false;
//     }
// };

// 检查所有API可用性
const checkAllApiAvailability = async () => {
    if (apiUrls.value.length === 0) {
        ElMessage.warning('没有可供检查的API');
        return;
    }

    isCheckingAllApis.value = true;
    let checkedCount = 0;

    try {
        const promises = apiUrls.value.map(async (api, index) => {
            try {
                const response = await makeApiRequest(api.url, {
                    text: 'hello',
                    source_lang: 'EN',
                    target_lang: 'ZH',
                });
                const isAvailable = !!(response.data && response.data.data);
                apiUrls.value[index].available = isAvailable;
                apiUrls.value[index].method = response.data?.method || 'Unknown';
                checkedCount++;
                ElMessage.success(`已检查 ${checkedCount}/${apiUrls.value.length} 个API`);
                return isAvailable;
            } catch (error) {
                console.error(`API检查失败 (${api.url}):`, error);
                apiUrls.value[index].available = false;
                checkedCount++;
                ElMessage.warning(`API ${api.url} 检查失败`);
                return false;
            }
        });

        await Promise.all(promises);

        // 保存更新后的状态
        localStorage.setItem('apiUrls', JSON.stringify(apiUrls.value));

        // 显示最终结果
        const availableCount = apiUrls.value.filter(api => api.available).length;
        ElMessage.success(`检查完成：${availableCount}/${apiUrls.value.length} 个API可用`);
    } catch (error) {
        console.error('API批量检查失败:', error);
        ElMessage.error('检查过程中发生错误');
    } finally {
        isCheckingAllApis.value = false;
    }
};

// 除不可用的API
const removeUnavailableApis = () => {
    const initialLength = apiUrls.value.length;
    apiUrls.value = apiUrls.value.filter(api => api.available);
    const removedCount = initialLength - apiUrls.value.length;

    // 保存更新后的状态
    localStorage.setItem('apiUrls', JSON.stringify(apiUrls.value));

    ElMessage.success(`已删除 ${removedCount} 个不可用的API`);
};

// 添加计算属性检查是否有不可用的API
const hasUnavailableApis = computed(() => {
    return apiUrls.value.some(api => !api.available);
});

// 添加复制功能函数
const copyResult = () => {
    if (translationResult.value) {
        navigator.clipboard.writeText(translationResult.value)
            .then(() => {
                ElMessage.success('复制成功');
            })
            .catch(() => {
                ElMessage.error('复制失败');
            });
    }
};

// 添加复制替代翻译的函数
const copyAlternativeResult = () => {
    if (alternativeTranslationsText.value) {
        navigator.clipboard.writeText(alternativeTranslationsText.value)
            .then(() => {
                ElMessage.success('复制成功');
            })
            .catch(() => {
                ElMessage.error('复制失败');
            });
    }
};

// 添加计算属性
const hasContent = computed(() => {
    return !!(sourceText.value.trim() ||
        translationResult.value.trim() ||
        alternativeTranslationsText.value.trim());
});

// 添加导出配置函数
const exportSettings = () => {
    const settings = {
        showMethodLabel: showMethodLabel.value,
        showTranslationTime: showTranslationTime.value,
        apiUrls: apiUrls.value,
        sourceLangs: sourceLangs.value,
        targetLangs: targetLangs.value,
        autoTargetLangForChinese: autoTargetLangForChinese.value,
        autoTargetLangForEnglish: autoTargetLangForEnglish.value
    };

    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'translator-settings.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    ElMessage.success('配置导出成功');
};

// 添加导入配置函数
const importSettings = (file: any) => {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const settings = JSON.parse(e.target?.result as string);

            // 更新配置
            if (settings.showMethodLabel !== undefined) {
                showMethodLabel.value = settings.showMethodLabel;
            }
            if (settings.showTranslationTime !== undefined) {
                showTranslationTime.value = settings.showTranslationTime;
            }
            if (settings.apiUrls) {
                apiUrls.value = settings.apiUrls;
            }
            if (settings.sourceLangs) {
                sourceLangs.value = settings.sourceLangs;
            }
            if (settings.targetLangs) {
                targetLangs.value = settings.targetLangs;
            }
            if (settings.autoTargetLangForChinese) {
                autoTargetLangForChinese.value = settings.autoTargetLangForChinese;
            }
            if (settings.autoTargetLangForEnglish) {
                autoTargetLangForEnglish.value = settings.autoTargetLangForEnglish;
            }

            // 保存到本地存储
            localStorage.setItem('showMethodLabel', JSON.stringify(showMethodLabel.value));
            localStorage.setItem('showTranslationTime', JSON.stringify(showTranslationTime.value));
            localStorage.setItem('apiUrls', JSON.stringify(apiUrls.value));
            localStorage.setItem('sourceLangs', JSON.stringify(sourceLangs.value));
            localStorage.setItem('targetLangs', JSON.stringify(targetLangs.value));

            ElMessage.success('配置导入成功');
        } catch (error) {
            ElMessage.error('配置文件格式错误');
        }
    };
    reader.readAsText(file.raw);
};

const calculateSuccessRate = (api: ApiUrlInfo) => {
    const total = (api.successCount || 0) + (api.failureCount || 0);
    if (total === 0) return 0;
    return Math.round((api.successCount || 0) / total * 100);
};

const formatLastUsed = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;

    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    return new Date(timestamp).toLocaleDateString();
};

// 在翻译成功时更新统计
const updateApiStats = (apiUrl: string, success: boolean) => {
    const apiIndex = apiUrls.value.findIndex(api => api.url === apiUrl);
    if (apiIndex === -1) return;

    const api = apiUrls.value[apiIndex];
    api.useCount = (api.useCount || 0) + 1;
    api.lastUsed = Date.now();

    if (success) {
        api.successCount = (api.successCount || 0) + 1;
    } else {
        api.failureCount = (api.failureCount || 0) + 1;
    }

    localStorage.setItem('apiUrls', JSON.stringify(apiUrls.value));
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
    margin-bottom: 5px;
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

.labels-container {
    position: absolute;
    top: -20px;
    /* 将标签移到文本框上方 */
    right: 0;
    display: flex;
    gap: 4px;
}

.method-label,
.time-label {
    font-size: 10px;
    padding: 0 4px;
    height: 16px;
    line-height: 16px;
}

.button-container {
    display: flex;
    gap: 20px;
}

.left-buttons {
    flex: 1;
    display: flex;
    position: relative;
}

.translate-button {
    flex: 1;
}

.right-buttons {
    flex: 1;
    display: flex;
    position: relative;
}

.copy-button {
    flex: 2;
    /* 复制按钮占2份 */
}

.clear-button {
    flex: 1;
    /* 清空按钮占1份 */
}

.settings-button {
    position: fixed;
    bottom: 50px;
    right: 50px;
}

.settings-dialog {
    max-width: 800px;
    margin: 0 auto;
}

.api-header {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-bottom: 20px;
}

.api-form {
    display: flex;
    align-items: center;
    margin-bottom: 0;
}

.api-form :deep(.el-form-item) {
    margin-bottom: 0;
    margin-right: 10px;
}

.api-form :deep(.el-form-item:first-child) {
    flex: 1;
}

.api-input {
    width: 100%;
}

.api-actions {
    display: flex;
    justify-content: flex-end;
    /* 将按钮靠右对齐 */
    gap: 8px;
}

:deep(.el-dialog__body) {
    max-height: 70vh;
    overflow-y: auto;
}

.alternative-translations {
    margin-top: 10px;
}

.alternative-input-container {
    position: relative;
}

.alternative-copy-button {
    position: absolute;
    right: 10px;
    bottom: 10px;
    opacity: 0.8;
}

.alternative-copy-button:hover {
    opacity: 1;
}

.settings-actions {
    display: flex;
    gap: 10px;
    margin: 10px 0;
}

.settings-upload {
    display: inline-block;
}

.settings-select {
    width: 160px;
}

.footer {
    position: fixed;
    bottom: 0;
    left: 0;
    width: 100%;
    padding: 10px 0;
    text-align: center;
    font-size: 12px;
    color: #666;
    background-color: #f5f7fa;
    border-top: 1px solid #e4e7ed;
}

.footer a {
    color: #409eff;
    text-decoration: none;
}

.footer a:hover {
    text-decoration: underline;
}

/* 为了防止底部内容被 footer 遮挡，给主容器添加底部内边距 */
.translator {
    padding-bottom: 40px;
    /* 根据 footer 高度调整 */
}

.api-stats {
    font-size: 12px;
    line-height: 1.5;
    color: #666;
}
</style>