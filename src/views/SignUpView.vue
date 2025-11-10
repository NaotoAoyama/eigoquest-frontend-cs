<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'

const username = ref('')
const password = ref('')
const passwordConfirm = ref('')
const errorMessage = ref<string | null>(null)
const isLoading = ref(false)
const router = useRouter()

// APIのベースURL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5033'
// Django APIのエンドポイントを定義
const signupApiUrl = `${API_BASE_URL}/api/accounts/register`

const handleSignUp = async () => {
  if (password.value !== passwordConfirm.value) {
    errorMessage.value = 'パスワードが一致しません。'
    return
  }
  isLoading.value = true
  errorMessage.value = null

  try {
    // 新規登録APIを呼び出す処理
    const response = await axios.post(signupApiUrl, {
      username: username.value,
      password: password.value,
      password_confirm: passwordConfirm.value,
    })

    // 登録成功 (201 Created)
    console.log('新規登録成功:', response.data)

    // 登録成功したらログインページへ自動遷移
    router.push('/login')
} catch (err: unknown) { // (型を any から unknown に修正)
    console.error('Sign up failed:', err)

    if (axios.isAxiosError(err) && err.response) {
      const errors = err.response.data

      // C# APIが返す "password_confirm" エラーを処理
      if (errors.password_confirm) {
        errorMessage.value = errors.password_confirm // (C# APIは文字列を返す)
      
      // C# APIが返す "username" エラー (配列) を処理
      // (パスワード強度不足のエラーなども "username" キーに含まれる)
      } else if (errors.username && Array.isArray(errors.username)) {
        // エラーが複数ある場合、すべて連結して表示
        errorMessage.value = errors.username.join(' ')
      
      } else {
        // 上記以外のC# APIからのエラー
        errorMessage.value = '登録中にエラーが発生しました。 (詳細はコンソールを確認)'
      }
    } else {
      // ネットワークエラーなど
      errorMessage.value = '登録中に予期せぬエラーが発生しました。'
    }
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="form-container">
    <div class="form-box">
      <h2>新規登録</h2>
      <form @submit.prevent="handleSignUp">
        <div>
          <label for="username">ユーザー名:</label>
          <input type="text" id="username" v-model="username" required />
        </div>
        <div>
          <label for="password">パスワード:</label>
          <input type="password" id="password" v-model="password" required />
        </div>
        <div>
          <label for="passwordConfirm">パスワード (確認):</label>
          <input type="password" id="passwordConfirm" v-model="passwordConfirm" required />
        </div>
        <p v-if="errorMessage" style="color: red">{{ errorMessage }}</p>
        <button type="submit" :disabled="isLoading">
          {{ isLoading ? '登録中...' : '登録する' }}
        </button>
      </form>
      <p>すでにアカウントをお持ちですか？ <router-link to="/login">ログイン</router-link></p>
      <p><router-link to="/">トップに戻る</router-link></p>
    </div>
  </div>
</template>

<style scoped>
/* LoginViewと同じスタイル */
.form-container {
  display: grid;
  place-items: center;
  min-height: 70vh;
}
.form-box {
  border: 1px solid #ccc;
  padding: 30px;
  border-radius: 8px;
}
.form-box div {
  margin-bottom: 15px;
}
.form-box label {
  display: block;
  margin-bottom: 5px;
}
.form-box input[type='text'],
.form-box input[type='password'] {
  width: 300px;
  padding: 8px;
}
button {
  padding: 10px 15px;
}
</style>
