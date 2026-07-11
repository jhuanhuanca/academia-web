const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api'

type ApiOptions = {
  method?: string
  body?: unknown
  token?: string | null
  formData?: FormData
}

export class ApiError extends Error {
  status: number
  data: unknown

  constructor(message: string, status: number, data: unknown) {
    super(message)
    this.status = status
    this.data = data
  }
}

export async function api<T = unknown>(path: string, options: ApiOptions = {}): Promise<T> {
  const token = options.token ?? localStorage.getItem('ml_token')
  const headers: Record<string, string> = {
    Accept: 'application/json',
  }
  if (token) headers.Authorization = `Bearer ${token}`

  let body: BodyInit | undefined
  if (options.formData) {
    body = options.formData
  } else if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(options.body)
  }

  const response = await fetch(`${API_URL}${path}`, {
    method: options.method || 'GET',
    headers,
    body,
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message =
      (data as { message?: string })?.message ||
      (data as { errors?: Record<string, string[]> })?.errors?.email?.[0] ||
      `Error ${response.status}`
    throw new ApiError(message, response.status, data)
  }

  return data as T
}

export { API_URL }
