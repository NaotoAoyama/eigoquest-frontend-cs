<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router' // URLパラメータ取得用
import axios from 'axios'
import { useAuthStore } from '@/stores/auth'

// C# API (QuestionResultDto) に対応する型
interface QuestionResult {
  id: number
  question_text: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_answer: string
  explanation: string | null
}

// C# API (ResultResponseDto) に対応する型
interface Result {
  id: number
  question: QuestionResult
  selected_answer: string
  is_correct: boolean
  answered_at: string // (DateTimeはJSONではstringになる)
}

// APIから取得した結果リスト
const results = ref<Result[]>([]) // ← any[] から Result[] に修正
const loading = ref(true)
const error = ref<string | null>(null)
const route = useRoute() // 現在のルート情報
const authStore = useAuthStore()

// APIのベースURL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5033'
// 結果取得APIのURL
const apiUrl = `${API_BASE_URL}/api/results/`

// URLのクエリパラメータ (?ids=...) から resultIds を取得
const resultIdsQuery = computed(() => (route.query.ids as string) || '')

// コンポーネントがマウントされた時にAPIを叩く
onMounted(async () => {
  if (!resultIdsQuery.value) {
    error.value = '結果IDが見つかりません。'
    loading.value = false
    return
  }

  try {
    const response = await axios.get(apiUrl, {
      // apiUrl は /api/results/
      params: { ids: resultIdsQuery.value }, // クエリパラメータは params で渡すのが安全
      headers: authStore.authHeader, // 認証ヘッダー
    })
    results.value = response.data
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      if (err.response?.status === 401) {
        error.value = '結果を表示するにはログインが必要です。'
        // router.push('/login') // 必要ならログインへ
      } else {
        error.value = `結果の取得に失敗しました: ${err.message}`
      }
    } else {
      error.value = '予期せぬエラーが発生しました。'
    }
    console.error('Result fetch error:', err)
  } finally {
    loading.value = false
  }
})

// 正解数を計算
const correctCount = computed(() => {
  return results.value.filter((r) => r.is_correct).length
})
const totalCount = computed(() => results.value.length)
</script>

<template>
  <div class="result-container">
    <h1>採点結果</h1>
    <p>
      <router-link to="/">トップに戻る</router-link> |
      <router-link to="/quiz">もう一度挑戦する (問題は変わります)</router-link>
    </p>

    <div v-if="loading">
      <p>結果を読み込んでいます...</p>
    </div>
    <div v-else-if="error">
      <p style="color: red">エラー: {{ error }}</p>
    </div>
    <div v-else>
      <div class="score-summary">{{ totalCount }} 問中 {{ correctCount }} 問正解！</div>

      <hr />

      <div v-for="(result, index) in results" :key="result.id" class="result-block">
        <h3>
          <span v-if="result.is_correct" class="correct">⭕ 正解！</span>
          <span v-else class="incorrect">❌ 不正解...</span>
          <span style="font-weight: normal; font-size: 0.9em"> (問題 {{ index + 1 }})</span>
        </h3>

        <p class="question-text">{{ result.question.question_text }}</p>

        <p>
          あなたの解答: <strong>{{ result.selected_answer }}</strong> (正解:
          <strong>{{ result.question.correct_answer }}</strong
          >)
        </p>

        <div v-if="result.question.explanation" class="explanation">
          <strong>【解説】</strong><br />
          <span v-html="result.question.explanation.replace(/\n/g, '<br>')"></span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Djangoテンプレートのスタイルを流用 */
.result-container {
  max-width: 800px;
  margin: 20px auto;
  padding: 25px;
  border: 1px solid #ccc;
  border-radius: 8px;
}
.score-summary {
  text-align: center;
  font-size: 1.5em;
  font-weight: bold;
  margin-bottom: 20px;
  padding: 20px;
}
.result-block {
  margin-bottom: 20px;
  border-bottom: 1px solid #eee;
  padding-bottom: 15px;
}
.correct {
  color: green;
  font-weight: bold;
}
.incorrect {
  color: red;
  font-weight: bold;
}
.question-text {
  font-weight: bold;
  white-space: pre-wrap;
}
.explanation {
  padding: 10px;
  margin-top: 10px;
  border-left: 5px solid #ddd;
  white-space: pre-wrap;
}
hr {
  margin: 20px 0;
}
</style>
