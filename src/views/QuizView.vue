<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue' // Vueのリアクティブ機能とライフサイクルフックをインポート
import axios from 'axios' // axiosをインポート
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

// APIから取得した問題リストを保持するリアクティブ変数
const questions = ref<any[]>([]) // 型は後でちゃんと定義するのが望ましい
const loading = ref(true) // ローディング状態
const error = ref<string | null>(null) // エラーメッセージ

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5033'
const apiUrl = `${API_BASE_URL}/api/quiz/`
const submitApiUrl = `${API_BASE_URL}/api/quiz/submit/`

// 変更前: const selectedAnswers = ref<{[key: number]: string}>({})
// 変更後: ref ではなく 'reactive' を使う
const selectedAnswers = reactive<{ [key: number]: string }>({})
const router = useRouter() // routerインスタンスを取得
const authStore = useAuthStore() // authストアを取得
const isSubmitting = ref(false) // 送信中フラグ

// コンポーネントがマウント（表示）された時にAPIを叩く
onMounted(async () => {
  try {
    // --- 変更点: axios.get に認証ヘッダーを追加 ---
    const response = await axios.get(apiUrl, {
      // withCredentials: true は削除し、トークン認証を使う
      headers: authStore.authHeader, // Piniaストアから 'Authorization: Bearer <token>' を取得
    })
    questions.value = response.data
    // 解答保持用オブジェクトを初期化
    // 変更前: questions.value.forEach(q => selectedAnswers.value[q.id] = '');
    // 変更後: reactive は .value が不要
    questions.value.forEach((q) => (selectedAnswers[q.id] = ''))
  } catch (err: any) {
    if (axios.isAxiosError(err)) {
      // --- 変更点: 403ではなく401 (Unauthorized) をチェック ---
      if (err.response?.status === 401) {
        error.value = 'クイズを開始するにはログインが必要です。'
        router.push('/login') // 401ならログインページへ強制遷移
      } else {
        error.value = `データの取得に失敗しました: ${err.message}`
      }
    } else {
      error.value = '予期せぬエラーが発生しました。'
    }
    console.error(err)
  } finally {
    loading.value = false
  }
})

const submitAnswers = async () => {
  // 変更前: console.log('採点ボタンクリック時の selectedAnswers:', selectedAnswers.value);
  // 変更後: reactive は .value が不要
  console.log('採点ボタンクリック時の selectedAnswers:', selectedAnswers)

  isSubmitting.value = true
  error.value = null // 前のエラーをクリア

  // selectedAnswers をAPIが期待する形式に変換

  const answersPayload = questions.value.map((question) => ({
    question_id: question.id,
    selected_answer: selectedAnswers[question.id] || '', // 未解答の場合は空文字
  }))

  // 変更後 (解答済みのカウント方法も変更)
  const answeredCount = answersPayload.filter((ans) => ans.selected_answer !== '').length

  const totalQuestions = questions.value.length
  console.log(`チェック: 解答済み ${answeredCount} / 全 ${totalQuestions} 問`) // 追加

  if (answeredCount !== totalQuestions) {
    alert(`すべての問題に解答してください (${answeredCount} / ${totalQuestions} 問 解答済み)`) // メッセージに件数を追加
    isSubmitting.value = false
    return
  }

  try {
    // 採点APIにPOSTリクエスト (認証ヘッダー付き)
    const response = await axios.post(submitApiUrl, answersPayload, {
      headers: authStore.authHeader,
    })

    // レスポンスから result_ids を取得
    const resultIds = response.data.result_ids as number[]

    // 結果ページに result_ids をクエリパラメータとして渡して遷移
    router.push({ name: 'result', query: { ids: resultIds.join(',') } })
  } catch (err) {
    console.error('採点中にエラー:', err)
    error.value = '採点中にエラーが発生しました。' // ユーザー向けエラー表示
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="quiz-container">
    <h1>ランダム10問クイズ</h1>
    <router-link to="/">トップに戻る</router-link>

    <hr />

    <div v-if="loading">
      <p>問題を読み込んでいます...</p>
    </div>

    <div v-else-if="error">
      <p style="color: red">エラー: {{ error }}</p>
      <p v-if="error.includes('ログイン')">
        <router-link to="/login">ログインページへ</router-link>
      </p>
    </div>

    <form v-else @submit.prevent="submitAnswers">
      <ol>
        <li v-for="(question, index) in questions" :key="question.id" class="question-block">
          <div class="question-text">{{ index + 1 }}. {{ question.question_text }}</div>

          <ul class="options">
            <li>
              <input
                type="radio"
                :name="'question_' + question.id"
                value="A"
                :id="'q' + question.id + '_a'"
                required
                v-model="selectedAnswers[question.id]"
              />
              <label :for="'q' + question.id + '_a'">(A) {{ question.option_a }}</label>
            </li>
            <li>
              <input
                type="radio"
                :name="'question_' + question.id"
                value="B"
                :id="'q' + question.id + '_b'"
                v-model="selectedAnswers[question.id]"
              />
              <label :for="'q' + question.id + '_b'">(B) {{ question.option_b }}</label>
            </li>
            <li>
              <input
                type="radio"
                :name="'question_' + question.id"
                value="C"
                :id="'q' + question.id + '_c'"
                v-model="selectedAnswers[question.id]"
              />
              <label :for="'q' + question.id + '_c'">(C) {{ question.option_c }}</label>
            </li>
            <li>
              <input
                type="radio"
                :name="'question_' + question.id"
                value="D"
                :id="'q' + question.id + '_d'"
                v-model="selectedAnswers[question.id]"
              />
              <label :for="'q' + question.id + '_d'">(D) {{ question.option_d }}</label>
            </li>
          </ul>
        </li>
      </ol>
      <button type="submit">採点する</button>
    </form>
  </div>
</template>

<style scoped>
/* このコンポーネント専用のCSS (Djangoの style.css と似たものを定義) */
.quiz-container {
  max-width: 800px;
  margin: 20px auto;
  padding: 25px;
  border: 1px solid #ccc;
  border-radius: 8px;
}
.question-block {
  margin-bottom: 25px;
  border-bottom: 1px solid #eee;
  padding-bottom: 15px;
}
.question-text {
  font-weight: bold;
  font-size: 1.2em;
  white-space: pre-wrap; /* 改行を反映 */
}
.options {
  list-style-type: none;
  padding-left: 10px;
}
.options li {
  margin: 10px 0;
}
button {
  font-size: 1.2em;
  padding: 10px 20px;
  margin-top: 20px;
}
hr {
  margin: 20px 0;
}
</style>
