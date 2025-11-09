import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://host.docker.internal:5123'

export const useAuthStore = defineStore('auth', () => {
  // state（状態）
  // アクセストークン(JWT)
  const accessToken = ref<string | null>(localStorage.getItem('accessToken'))
  // リフレッシュトークン（JWT)
  const refreshToken = ref<string | null>(localStorage.getItem('refreshToken'))
  // ログインユーザーの情報（必要に応じて拡張）
  const user = ref<unknown | null>(JSON.parse(localStorage.getItem('user') || 'null'))
  // 認証に関するエラーメッセージ
  const authError = ref<string | null>(null)
  // ローディング状態
  const isLoading = ref(false)

  // Getters（計算された状態）
  // ログインしているかどうかの判定（アクセストークンの有無）
  const isAuthenticated = computed(() => !!accessToken.value)
  // 認証用のHTTPヘッダー(Authorization: Bearer <token>)
  const authHeader = computed(() => {
    return accessToken.value ? { Authorization: `Bearer ${accessToken.value}` } : {}
  })

  // Actions（状態を変更するメソッド）

  // ログイン処理
  async function login(username: string, password: string) {
    isLoading.value = true
    authError.value = null
    try {
      const response = await axios.post(`${API_BASE_URL}/api/accounts/login`, {
        username: username,
        password: password,
      })
　　　　// レスポンスからトークンを取得 (C# APIのAuthResponseDto に合わせる)
      accessToken.value = response.data.accessToken
      refreshToken.value = response.data.refreshToken
      // トークンをLocalStorageに保存（ブラウザを閉じても維持するため）
      localStorage.setItem('accessToken', accessToken.value!)
      localStorage.setItem('refreshToken', refreshToken.value!)

      // ユーザー情報を取得する（別途APIが必要 or トークンからデコード）
      // ここでは仮にユーザー名を保存
      user.value = { username: username }
      localStorage.setItem('user', JSON.stringify(user.value))

      return true // ログイン成功
    } catch (err: unknown) {
      console.error('Login failed:', err)
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        authError.value = 'ユーザー名またはパスワードが正しくありません。'
      } else {
        authError.value = 'ログイン中にエラーが発生しました。'
      }
      return false // ログイン失敗
    } finally {
      isLoading.value = false
    }
  }

  // ログアウト処理
  function logout() {
    accessToken.value = null
    refreshToken.value = null
    user.value = null
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    // トークン無効化APIを叩くのが望ましい（SimpleJWTには標準ではない）
  }

  // （アクセストークン更新処理ー必要に応じて後で実装）
  // async function refrechAccessToken() {...}

  // ストアの公開
  return {
    accessToken,
    refreshToken,
    user,
    authError,
    isLoading,
    isAuthenticated,
    authHeader,
    login,
    logout,
    // refreshAccessToken
  }
})
