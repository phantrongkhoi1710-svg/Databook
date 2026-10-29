/**
 * Utility for safe API requests that never crashes on non-JSON / HTML responses.
 */
export interface ApiResponse<T = any> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
  warning?: string | null;
  message?: string;
}

export async function safeFetchJson<T = any>(
  url: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(url, options);
    const contentType = res.headers.get('content-type') || '';

    // Check if the server returned JSON
    if (contentType.includes('application/json')) {
      const json = await res.json();
      if (!res.ok) {
        return {
          ok: false,
          status: res.status,
          error: json.error || `Yêu cầu thất bại (Mã lỗi ${res.status}).`,
          warning: json.warning || null,
        };
      }
      return {
        ok: true,
        status: res.status,
        data: json,
        warning: json.warning || null,
        message: json.message,
      };
    }

    // Server returned HTML (e.g., warmup page, proxy 502/403, or 404 page)
    const text = await res.text();
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        return {
          ok: false,
          status: res.status,
          error: 'Phiên làm việc đã hết hạn hoặc bạn chưa được cấp quyền.',
        };
      }
      return {
        ok: false,
        status: res.status,
        error: `Máy chủ tạm thời chưa sẵn sàng (Mã lỗi ${res.status}). Vui lòng thử lại.`,
      };
    }

    // Unexpected non-JSON successful response
    return {
      ok: false,
      status: res.status,
      error: 'Phản hồi từ máy chủ không đúng định dạng JSON.',
    };
  } catch (err: any) {
    return {
      ok: false,
      status: 0,
      error: err.message || 'Lỗi kết nối mạng đến máy chủ.',
    };
  }
}
