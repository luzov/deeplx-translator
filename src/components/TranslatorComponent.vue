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
            <el-input 
                v-model="sourceText" 
                type="textarea" 
                :rows="textareaRows" 
                :autosize="{ minRows: 8, maxRows: 20 }"
                resize="vertical"
                @mousedown="startSync"
                @mouseup="stopSync" 
                ref="sourceTextarea" 
                placeholder="请输入要翻译的文本" 
                class="translation-input" 
            />

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
                <el-input 
                    v-model="translationResult" 
                    type="textarea" 
                    :rows="textareaRows" 
                    :autosize="{ minRows: 8, maxRows: 20 }"
                    resize="vertical"
                    @mousedown="startSync"
                    @mouseup="stopSync" 
                    ref="resultTextarea" 
                    placeholder="翻译结果" 
                    readonly
                    class="translation-input" 
                />
            </div>
        </div>
        <div class="button-container">
            <div class="left-buttons">
                <el-button class="translate-button" type="primary" plain @click="translate" :loading="isTranslating"
                    :disabled="!hasSourceText">翻译</el-button>
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
                <!-- 通用设置（语言设置） -->
                <el-tab-pane label="通用">
                    <el-form label-width="180px" class="settings-form">
                        <div class="settings-group">
                            <div class="settings-group-title">语言设置</div>
                            <el-form-item label="默认源语言">
                                <el-select v-model="defaultSourceLang" placeholder="选择默认源语言" class="settings-select">
                                    <el-option v-for="lang in enabledSourceLangs" :key="lang.value" :label="lang.label"
                                        :value="lang.value" />
                                </el-select>
                            </el-form-item>

                            <el-form-item label="默认目标语言">
                                <el-select v-model="defaultTargetLang" placeholder="选择默认目标语言" class="settings-select">
                                    <el-option v-for="lang in enabledTargetLangs" :key="lang.value" :label="lang.label"
                                        :value="lang.value" />
                                </el-select>
                            </el-form-item>

                            <el-form-item label="输入中文时目标语言">
                                <el-select v-model="autoTargetLangForChinese" placeholder="选择目标语言"
                                    class="settings-select">
                                    <el-option
                                        v-for="lang in enabledTargetLangs.filter(l => !['ZH-HANS'].includes(l.value))"
                                        :key="lang.value" :label="lang.label" :value="lang.value" />
                                </el-select>
                            </el-form-item>

                            <el-form-item label="输入英文时目标语言">
                                <el-select v-model="autoTargetLangForEnglish" placeholder="选择目标语言"
                                    class="settings-select">
                                    <el-option
                                        v-for="lang in enabledTargetLangs.filter(l => !['EN-US'].includes(l.value))"
                                        :key="lang.value" :label="lang.label" :value="lang.value" />
                                </el-select>
                            </el-form-item>
                        </div>
                    </el-form>
                </el-tab-pane>

                <!-- 显示设置 -->
                <el-tab-pane label="显示">
                    <el-form label-width="180px" class="settings-form">
                        <div class="settings-group">
                            <div class="settings-group-title">显示设置</div>
                            <el-form-item label="显示翻译引擎标签">
                                <el-switch v-model="showMethodLabel" />
                            </el-form-item>
                            <el-form-item label="显示翻译用时">
                                <el-switch v-model="showTranslationTime" />
                            </el-form-item>
                        </div>
                    </el-form>
                </el-tab-pane>

                <!-- API设置 -->
                <el-tab-pane label="API">
                    <div class="api-header">
                        <div class="api-form-container">
                            <el-form :inline="true" class="api-form">
                                <el-form-item label="API 地址" class="api-input-item">
                                    <el-input v-model="newApiUrl" placeholder="输入新的 API 地址" clearable
                                        @clear="newApiUrl = ''" />
                                </el-form-item>
                                <el-form-item class="api-button-item">
                                    <el-button type="primary" @click="addApiUrl" :loading="isCheckingApi">添加</el-button>
                                </el-form-item>
                            </el-form>
                        </div>
                        <div class="api-actions">
                            <el-switch v-model="autoAppendTranslateSuffix" active-text="自动添加 /translate 后缀"
                                size="small" />
                            <div class="api-actions-spacer"></div>
                            <el-button type="primary" size="small" @click="checkAllApiAvailability"
                                :loading="isCheckingAllApis">
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

                <!-- 源语言设置 -->
                <el-tab-pane label="源语言">
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

                <!-- 目标语言设置 -->
                <el-tab-pane label="目标语言">
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

                <!-- 配置管理 -->
                <el-tab-pane label="配置管理">
                    <el-form label-width="180px" class="settings-form">
                        <div class="settings-group">
                            <div class="settings-group-title">配置管理</div>
                            <el-form-item class="settings-actions">
                                <el-button type="primary" plain @click="exportSettings">导出配置</el-button>
                                <el-upload class="settings-upload" action="" :auto-upload="false"
                                    :show-file-list="false" accept=".json" @change="importSettings">
                                    <el-button type="primary" plain>导入配置</el-button>
                                </el-upload>
                            </el-form-item>

                            <el-form-item>
                                <el-popconfirm title="确定要清除所有本地配置吗？此操作不可逆。" @confirm="clearAllLocalSettings"
                                    confirm-button-text="确定" cancel-button-text="取消">
                                    <template #reference>
                                        <el-button type="danger">清除所有本地配置</el-button>
                                    </template>
                                </el-popconfirm>
                            </el-form-item>
                        </div>
                    </el-form>
                </el-tab-pane>
            </el-tabs>
        </el-dialog>

        <!-- 添加作者信息 -->
        <div class="footer">
            <span>
                Powered by Cursor | Created by <a href="https://github.com/luzov" target="_blank">luzov</a> | v{{ version }}
            </span>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { ref, watch, computed, onMounted, h, reactive, onUnmounted } from 'vue';
import axios from 'axios';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Refresh, Setting, Document } from '@element-plus/icons-vue';
import { version } from '../../package.json';

const sourceText = ref('');  // 源文本
const translationResult = ref('');  // 翻译结果
const alternativeTranslations = ref<string[]>([]);  // 替代翻译
const alternativeTranslationsText = ref('');  // 替代翻译文本
const translationMethod = ref('');  // 翻译引擎
const isTranslating = ref(false);   // 是否正在翻译
const settingsVisible = ref(false); // 设置对话框是否可见
const newApiUrl = ref('');  // 新API地址
const apiUrls = ref<{ url: string; method: string; available: boolean; useCount: number; lastUsed: number; successCount: number; failureCount: number }[]>([]); // API列表
const sourceLang = ref('AUTO');  // 源语言
const targetLang = ref('ZH-HANS');  // 目标语言
const showMethodLabel = ref(true);  // 显示翻译引擎标签
const isCheckingApi = ref(false);  // 检查API可用性
const isCheckingAllApis = ref(false);   // 检查API可用性
const showTranslationTime = ref(true);  // 显示翻译用时
const translationTime = ref(0); // 翻译用时
const autoTargetLangForChinese = ref('EN-US');  // 检测到中文时的默认目标语言
const autoTargetLangForEnglish = ref('ZH-HANS');  // 检测到英文时的默认目标语言
const defaultSourceLang = ref('AUTO');  // 默认源语言
const defaultTargetLang = ref('ZH-HANS');  // 默认目标语言
const lastValidText = ref('');  // 上一次的有效输入文本
const autoAppendTranslateSuffix = ref(true); // 是否自动添加 /translate 后缀，默认开启

// 添加一个取消控制器的引用
const currentTranslationController = ref<AbortController | null>(null);

// 语言设置
interface Language {
    value: string;
    label: string;
    enabled: boolean;
}

// 源语言列表
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
    { value: 'EL', label: '希腊', enabled: false },
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
    { value: 'SK', label: '斯洛伐语', enabled: false },
    { value: 'SL', label: '斯洛文尼亚语', enabled: false },
    { value: 'SV', label: '瑞典语', enabled: false },
    { value: 'TR', label: '土耳其语', enabled: false },
    { value: 'UK', label: '乌克兰语', enabled: false },
]);

// 目标语言列表
const targetLangs = ref<Language[]>([
    { value: 'ZH-HANS', label: '中文（简体）', enabled: true },
    { value: 'EN-US', label: '英语（美国）', enabled: true },
    { value: 'EN-GB', label: '英语（英国）', enabled: false },
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
    { value: 'ZH-HANT', label: '中文（繁体）', enabled: false },
]);

// 启用源语言列表
const enabledSourceLangs = computed(() => sourceLangs.value.filter(lang => lang.enabled));
// 启用目标语言列表
const enabledTargetLangs = computed(() => targetLangs.value.filter(lang => lang.enabled));


// 修改格式化API URL的辅助函数
const formatProxyUrl = (originalUrl: string) => {
    try {
        // 去除空格并获取基本信息
        originalUrl = originalUrl.trim();
        const isPageHttps = window.location.protocol === 'https:';

        // 提取URL协议和主体部分
        const getUrlParts = (url: string) => {
            const protocolMatch = url.match(/^(https?):\/\//);
            return {
                protocol: protocolMatch ? protocolMatch[1] : 'http',
                urlBody: url.replace(/^https?:\/\//, '').replace(/\/$/, '')
            };
        };

        // 处理IP地址格式
        const ipRegex = /^(https?:\/\/)((?:\d{1,3}\.){3}\d{1,3})(:\d+)?(\/.*)$/;
        const ipMatch = originalUrl.match(ipRegex);
        if (ipMatch) {
            if (isPageHttps && ipMatch[1].toLowerCase() === 'http://') {
                const { protocol, urlBody } = getUrlParts(originalUrl);
                return `/api/${protocol}/${urlBody}`;
            }
            return originalUrl;
        }

        // 处理常规URL
        const { protocol, urlBody } = getUrlParts(originalUrl);
        const finalUrlBody = urlBody.includes('/') ? urlBody : `${urlBody}/`;

        return `/api/${protocol}/${finalUrlBody}`;

    } catch (error) {
        console.error('URL格式化错误:', error);
        return originalUrl;
    }
};

// 修改API请求函数，添加重试逻辑
const makeApiRequest = async (url: string, data: any, retriesOrSignal?: number | AbortSignal, signal?: AbortSignal): Promise<any> => {
    const retries = typeof retriesOrSignal === 'number' ? retriesOrSignal : 1;
    const abortSignal = retriesOrSignal instanceof AbortSignal ? retriesOrSignal : signal;

    try {
        const proxyUrl = formatProxyUrl(url);
        const response = await axios.post(proxyUrl, data, {
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json',
            },
            ...(abortSignal && { signal: abortSignal }),
        });
        return response;
    } catch (error: any) {
        // console.log(error.name)
        if (error.name === 'CanceledError') {
            throw error; // 直接抛出取消错误
        }
        if (retries > 0 && error.response?.status === 502) {
            // 如果是502错误且还有重试次数，等待后重试
            await new Promise(resolve => setTimeout(resolve, 1000));
            return makeApiRequest(url, data, retries - 1, signal);
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
const translate = async (isAutoTranslate = false) => {
    // 如果不是自动翻译且正在翻译中，则不执行
    if (!isAutoTranslate && isTranslating.value) {
        return;
    }

    isTranslating.value = true;
    const startTime = Date.now();

    // 创建新的 AbortController
    currentTranslationController.value = new AbortController();
    const signal = currentTranslationController.value.signal;

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

    // 遍历所有可用的API直到翻译成功
    for (let i = 0; i < availableApis.length; i++) {
        const currentApi = availableApis[i];

        try {
            const response = await makeApiRequest(currentApi.url, {
                text: sourceText.value,
                source_lang: sourceLang.value,
                target_lang: targetLang.value,
            }, signal);

            if (response.data && response.data.data) {
                updateApiStats(currentApi.url, true);
                // 更新API使用统计
                const apiIndex = apiUrls.value.findIndex(api => api.url === currentApi.url);
                if (apiIndex !== -1) {
                    apiUrls.value[apiIndex].useCount = (apiUrls.value[apiIndex].useCount || 0) + 1;
                    apiUrls.value[apiIndex].lastUsed = Date.now();
                    localStorage.setItem('apiUrls', JSON.stringify(apiUrls.value));
                }

                translationResult.value = response.data.data;
                alternativeTranslations.value = response.data.alternatives || [];
                alternativeTranslationsText.value = alternativeTranslations.value.join('\n');
                translationMethod.value = response.data.method;

                break; // 翻译成功，退出循环
            }
        } catch (error: any) {
            // console.log(error.name)
            if (error.name === 'CanceledError') {
                // 请求被取消，不更新统计信息，直接结束
                console.log('Translation request cancelled');
                break;
            }
            
            // 只有在非取消错误时才更新失败统计
            updateApiStats(currentApi.url, false);
            console.error('Translation failed:', error.message);

            // 只有在非取消错误时才标记 API 为不可用
            const apiIndex = apiUrls.value.findIndex(api => api.url === currentApi.url);
            if (apiIndex !== -1) {
                apiUrls.value[apiIndex].available = false;
                localStorage.setItem('apiUrls', JSON.stringify(apiUrls.value));
            }

            // 如果还有其他API可用，提示用户正在切换到下一个API
            if (i < availableApis.length - 1) {
                ElMessage.warning(`API "${currentApi.url}" 请求失败，正在尝试使用下一个API...`);
                continue;
            }

            // 所有API都失败时显示错误信息
            ElMessage.error('所有API均请求失败，请检查API设置或网络连接');
        }
    }

    translationTime.value = Date.now() - startTime;
    isTranslating.value = false;
    currentTranslationController.value = null;
};

// 添加API函数
const addApiUrl = async () => {
    if (!newApiUrl.value) {
        ElMessage.warning('请输入 API 地址');
        return;
    }

    // 处理 URL
    let processedUrl = newApiUrl.value.trim().replace(/\/$/, ''); // 移除末尾的斜杠
    if (autoAppendTranslateSuffix.value && !processedUrl.toLowerCase().endsWith('/translate')) {
        processedUrl += '/translate';
    }

    const exists = apiUrls.value.some(api => {
        const existingUrl = api.url.trim().replace(/\/$/, '');
        return existingUrl.toLowerCase() === processedUrl.toLowerCase();
    });

    if (exists) {
        ElMessage.warning('该 API 地址已存在');
        return;
    }

    isCheckingApi.value = true;
    try {
        const response = await makeApiRequest(processedUrl, {
            text: 'hello',
            source_lang: 'AUTO',
            target_lang: 'ZH-HANS',
        });

        if (response.data && response.data.data) {
            apiUrls.value.push({
                url: processedUrl,
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

    const savedDefaultSourceLang = localStorage.getItem('defaultSourceLang');
    if (savedDefaultSourceLang) {
        defaultSourceLang.value = savedDefaultSourceLang;
        sourceLang.value = savedDefaultSourceLang; // 设置初始源语言
    }

    const savedDefaultTargetLang = localStorage.getItem('defaultTargetLang');
    if (savedDefaultTargetLang) {
        defaultTargetLang.value = savedDefaultTargetLang;
        targetLang.value = savedDefaultTargetLang; // 设置初始目标语言
    }

    const savedAutoAppendTranslateSuffix = localStorage.getItem('autoAppendTranslateSuffix');
    if (savedAutoAppendTranslateSuffix !== null) {
        autoAppendTranslateSuffix.value = JSON.parse(savedAutoAppendTranslateSuffix);
    }
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
                    source_lang: 'AUTO',
                    target_lang: 'ZH-HANS',
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
        autoTargetLangForEnglish: autoTargetLangForEnglish.value,
        defaultSourceLang: defaultSourceLang.value,
        defaultTargetLang: defaultTargetLang.value,
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
            if (settings.defaultSourceLang) {
                defaultSourceLang.value = settings.defaultSourceLang;
            }
            if (settings.defaultTargetLang) {
                defaultTargetLang.value = settings.defaultTargetLang;
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

// 防抖函数
const debounce = (fn: Function, delay: number) => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    return function (this: any, ...args: any[]) {
        if (timeoutId !== null) {
            clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(() => fn.apply(this, args), delay);
    };
};

// 检测中文
const containsChinese = (text: string): boolean => {
    return /[\u4e00-\u9fa5]/.test(text);
};

// 检测英语
const containsEnglish = (text: string): boolean => {
    return /[a-zA-Z]/.test(text);
};


// 修改 sourceText 的监听器
watch(sourceText, debounce(async () => {
    const text = sourceText.value.trim();

    // 如果输入为空，清空结果
    if (!text) {
        translationResult.value = '';
        alternativeTranslations.value = [];
        alternativeTranslationsText.value = '';
        translationMethod.value = '';
        translationTime.value = 0;
        lastValidText.value = '';
        return;
    }

    if (text === lastValidText.value) {
        return;
    }

    // 更新最后的有效文本
    lastValidText.value = text;

    let shouldTranslate = true;

    // 检测中文并自动切换目标语言
    if (containsChinese(text) && ['ZH-HANS', 'ZH-HANT'].includes(targetLang.value)) {
        sourceLang.value = 'AUTO';
        targetLang.value = autoTargetLangForChinese.value;
        ElMessage.success('检测到中文输入，已自动切换目标语言');
        shouldTranslate = false; // 不在这里翻译，等待 targetLang 的 watch 触发
    }

    // 检测英语并自动切换目标语言
    if (containsEnglish(text) && ['EN-GB', 'EN-US'].includes(targetLang.value)) {
        sourceLang.value = 'AUTO';
        targetLang.value = autoTargetLangForEnglish.value;
        ElMessage.success('检测到英语输入，已自动切换目标语言');
        shouldTranslate = false; // 不在这里翻译，等待 targetLang 的 watch 触发
    }

    // 只有在没有切换语言时才直接翻译
    if (shouldTranslate) {
        // 取消之前的翻译请求
        if (currentTranslationController.value) {
            currentTranslationController.value.abort();
        }
        await translate(true); // 传入 true 表示这是自动翻译
    }
}, 800), { deep: true });

// 添加对目标语言变化的监听
watch(targetLang, async (newValue, oldValue) => {
    // 如果新值和旧值相同,则不触发翻译
    if (newValue === oldValue) {
        return;
    }

    // 如果源文本为空,则不触发翻译
    if (!sourceText.value.trim()) {
        return;
    }

    // 如果正在翻译中,则不触发新的翻译
    if (isTranslating.value) {
        return;
    }

    // 触发翻译
    await translate();
});

const showSettings = () => {
    settingsVisible.value = true;
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

// 添加对默认语言变化的监听
watch([defaultSourceLang, defaultTargetLang], ([newSourceLang, newTargetLang]) => {
    localStorage.setItem('defaultSourceLang', newSourceLang);
    localStorage.setItem('defaultTargetLang', newTargetLang);

    // 更新当前语言选择
    sourceLang.value = newSourceLang;
    targetLang.value = newTargetLang;
});

// 监听设置变化并保存
watch(autoAppendTranslateSuffix, (newValue) => {
    localStorage.setItem('autoAppendTranslateSuffix', JSON.stringify(newValue));
});

// 添加计算属性检查源文本是否为空
const hasSourceText = computed(() => {
    return sourceText.value.trim().length > 0;
});

// 添加新的响应式变量
const textareaRows = ref(12);
const sourceTextarea = ref();
const resultTextarea = ref();

// 添加新的响应式变量来跟踪同步状态
const isResizing = ref(false);
const activeTextarea = ref<'source' | 'result' | null>(null);

// 开始同步
const startSync = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    // 检查是否点击在右下角的 resize 手柄上
    if (target.tagName === 'TEXTAREA' &&
        event.offsetX > target.clientWidth - 20 &&
        event.offsetY > target.clientHeight - 20) {
        isResizing.value = true;
        activeTextarea.value = (target.closest('.translation-input')?.contains(sourceTextarea.value.$el))
            ? 'source'
            : 'result';
        document.addEventListener('mousemove', handleMouseMove);
    }
};

// 停止同步
const stopSync = () => {
    if (isResizing.value) {
        isResizing.value = false;
        activeTextarea.value = null;
        document.removeEventListener('mousemove', handleMouseMove);
    }
};

// 处理鼠标移动
const handleMouseMove = () => {
    if (!isResizing.value || !activeTextarea.value) return;

    requestAnimationFrame(() => {
        const sourceEl = sourceTextarea.value.$el.querySelector('textarea');
        const resultEl = resultTextarea.value.$el.querySelector('textarea');

        if (sourceEl && resultEl) {
            if (activeTextarea.value === 'source') {
                resultEl.style.height = sourceEl.style.height;
            } else {
                sourceEl.style.height = resultEl.style.height;
            }
        }
    });
};

// 组件卸载时清理事件监听
onUnmounted(() => {
    document.removeEventListener('mousemove', handleMouseMove);
});

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
    /* 调交换按钮的间距 */
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
    width: 100%;
}

.api-form-container {
    width: 100%;
}

.api-form {
    display: flex;
    width: 100%;
}

.api-input-item {
    flex: 1;
    margin-right: 10px;
}

.api-button-item {
    width: auto;
    margin-right: 0 !important;
}

.api-input-item :deep(.el-form-item__content) {
    width: 100%;
}

.api-actions {
    display: flex;
    width: 100%;
    justify-content: flex-end;
    align-items: center;
    gap: 8px;
    padding: 0;
    margin: 0;
}

.api-actions-spacer {
    flex: 1;
}

/* 确保表单项之间的间距一致 */
.api-form :deep(.el-form-item) {
    margin-bottom: 0;
    margin-right: 10px;
}

.api-form :deep(.el-form-item:last-child) {
    margin-right: 0;
}

/* 确保输入框占满可用空间 */
.api-form :deep(.el-input) {
    width: 100%;
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
    gap: 20px;
    margin: 10px 0;
    justify-content: space-between;
}

.settings-upload {
    display: inline-block;
    margin-left: 10px;
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

/* 设置表单整体样式 */
.settings-form {
    padding: 20px;
    max-width: 800px;
    margin: 0 auto;
}

/* 设置组样式 */
.settings-group {
    margin-bottom: 30px;
    padding-bottom: 20px;
    border-bottom: 1px solid #ebeef5;
}

.settings-group:last-child {
    border-bottom: none;
    margin-bottom: 0;
    padding-bottom: 0;
}

.settings-group-title {
    font-size: 16px;
    font-weight: 500;
    color: #303133;
    margin-bottom: 20px;
}

/* 统一表单项样式 */
.settings-form :deep(.el-form-item) {
    margin-bottom: 20px;
}

.settings-form :deep(.el-form-item__label) {
    font-weight: normal;
    color: #606266;
}

/* 统一选择框宽度 */
.settings-select {
    width: 240px;
}

/* 配置管理按钮组样式 */
.settings-actions {
    display: flex;
    gap: 10px;
}

.settings-upload {
    display: inline-block;
}

/* 确保所有表单控件左对齐 */
.settings-form :deep(.el-form-item__content) {
    display: flex;
    justify-content: flex-start;
}

/* 开关组件样式调整 */
.settings-form :deep(.el-switch) {
    margin-right: auto;
}

/* 修改文本框样式以支持拖动 */
.translation-input :deep(textarea) {
    resize: vertical;
    /* min-height: 200px; 删除这行 */
    /* max-height: 800px; 删除这行 */
}
</style>
